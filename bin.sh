#!/bin/bash

StackName="CodeBuildForDeploy"
Region="us-west-2"

stackExists=$(aws cloudformation describe-stacks --stack-name $StackName --region $Region --query 'Stacks[0].StackId' --output text 2>/dev/null)

if [ -z "$stackExists" ]; then
  # Stack does not exist, create it
  stackId=$(aws cloudformation create-stack \
    --stack-name $StackName \
    --template-body file://deploy.yml \
    --capabilities CAPABILITY_IAM \
    --region $Region \
    --query 'StackId' --output text)
else
  # Stack already exists, update it
  stackId=$(aws cloudformation update-stack \
    --stack-name $StackName \
    --template-body file://deploy.yml \
    --capabilities CAPABILITY_IAM \
    --region $Region \
    --query 'StackId' --output text)
fi

echo "Waiting for the stack creation to complete..."
echo "NOTE: this stack contains CodeBuild project which will be used for cdk deploy."
spin='-\|/'
i=0
while true; do
    status=$(aws cloudformation describe-stacks --stack-name $StackName --region $Region --query 'Stacks[0].StackStatus' --output text)
    if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" || "$status" == "DELETE_COMPLETE" ]]; then
        break
    fi
    printf "\r${spin:i++%${#spin}:1}"
done
echo -e "\nDone.\n"

outputs=$(aws cloudformation describe-stacks --stack-name $StackName --region $Region --query 'Stacks[0].Outputs')
projectName=$(echo $outputs | jq -r '.[] | select(.OutputKey=="ProjectName").OutputValue')

echo "Starting CodeBuild project: $projectName..."
buildId=$(aws codebuild start-build --project-name $projectName --region $Region --query 'build.id' --output text)

echo "Waiting for the CodeBuild project to complete..."
while true; do
    buildStatus=$(aws codebuild batch-get-builds --ids $buildId --region $Region --query 'builds[0].buildStatus' --output text)
    if [[ "$buildStatus" == "SUCCEEDED" || "$buildStatus" == "FAILED" || "$buildStatus" == "STOPPED" ]]; then
        break
    fi
    sleep 10
done
echo "CodeBuild project completed with status: $buildStatus"

buildDetail=$(aws codebuild batch-get-builds --ids $buildId --region $Region --query 'builds[0].logs.{groupName: groupName, streamName: streamName}' --output json)

logGroupName=$(echo $buildDetail | jq -r '.groupName')
logStreamName=$(echo $buildDetail | jq -r '.streamName')

echo "Build Log Group Name: $logGroupName"
echo "Build Log Stream Name: $logStreamName"

echo "Fetch CDK deployment logs..."
logs=$(aws logs get-log-events --log-group-name $logGroupName --log-stream-name $logStreamName --region $Region)
frontendUrl=$(echo "$logs" | grep -o 'FrontendURL = [^ ]*' | cut -d' ' -f3 | tr -d '\n,')

echo "Frontend URL: $frontendUrl (scott-llm-experiment-center.com)"
