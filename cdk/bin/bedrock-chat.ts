#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { BedrockChatStack } from "../lib/bedrock-chat-stack";
import { FrontendWafStack } from "../lib/frontend-waf-stack";
import { CronScheduleProps } from "../lib/utils/cron-schedule";
import { TIdentityProvider } from "../lib/utils/identity-provider";

const app = new cdk.App();

const BEDROCK_REGION = app.node.tryGetContext("bedrockRegion");

const domainName = 'scott-llm-experiment-center.com';

// Allowed IP address ranges for this app itself
const ALLOWED_IP_V4_ADDRESS_RANGES: string[] = app.node.tryGetContext(
  "allowedIpV4AddressRanges"
);
const ALLOWED_IP_V6_ADDRESS_RANGES: string[] = app.node.tryGetContext(
  "allowedIpV6AddressRanges"
);

// Allowed IP address ranges for the published API
const PUBLISHED_API_ALLOWED_IP_V4_ADDRESS_RANGES: string[] =
  app.node.tryGetContext("publishedApiAllowedIpV4AddressRanges");
const PUBLISHED_API_ALLOWED_IP_V6_ADDRESS_RANGES: string[] =
  app.node.tryGetContext("publishedApiAllowedIpV6AddressRanges");
const ALLOWED_SIGN_UP_EMAIL_DOMAINS: string[] =
  app.node.tryGetContext('allowedSignUpEmailDomains');
const IDENTITY_PROVIDERS: TIdentityProvider[] =
  app.node.tryGetContext("identityProviders");
const USER_POOL_DOMAIN_PREFIX: string = app.node.tryGetContext(
  "userPoolDomainPrefix"
);
const RDS_SCHEDULES: CronScheduleProps = app.node.tryGetContext("rdbSchedules");
// WAF for frontend
// 2023/9: Currently, the WAF for CloudFront needs to be created in the North America region (us-east-1), so the stacks are separated
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html
const waf = new FrontendWafStack(app, `FrontendWafStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  allowedIpV4AddressRanges: ALLOWED_IP_V4_ADDRESS_RANGES,
  allowedIpV6AddressRanges: ALLOWED_IP_V6_ADDRESS_RANGES,
  domainName: domainName
});

const chat = new BedrockChatStack(app, `BedrockChatStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true,
  bedrockRegion: BEDROCK_REGION,
  domainName: domainName,
  webAclId: waf.webAclArn.value,
  certificateArn: waf.certificateArn.value,
  identityProviders: IDENTITY_PROVIDERS,
  userPoolDomainPrefix: USER_POOL_DOMAIN_PREFIX,
  publishedApiAllowedIpV4AddressRanges:
    PUBLISHED_API_ALLOWED_IP_V4_ADDRESS_RANGES,
  publishedApiAllowedIpV6AddressRanges:
    PUBLISHED_API_ALLOWED_IP_V6_ADDRESS_RANGES,
  allowedSignUpEmailDomains: 
    ALLOWED_SIGN_UP_EMAIL_DOMAINS,
  rdsSchedules: RDS_SCHEDULES,
});
chat.addDependency(waf);
