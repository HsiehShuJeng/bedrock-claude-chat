import * as cdk from 'aws-cdk-lib';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

interface FrontendWafStackProps extends StackProps {
  readonly allowedIpV4AddressRanges: string[];
  readonly allowedIpV6AddressRanges: string[];
  readonly domainName: string;
}

/**
 * Frontend WAF
 */
export class FrontendWafStack extends Stack {
  /**
   * Web ACL ARN
   */
  public readonly webAclArn: CfnOutput;
  public readonly certificateArn: CfnOutput;

  constructor(scope: Construct, id: string, props: FrontendWafStackProps) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
      privateZone: false
    });
    const certificate = new Certificate(this, "Certificate", {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    // create Ipset for ACL
    const ipV4SetReferenceStatement = new wafv2.CfnIPSet(
      this,
      "FrontendIpV4Set",
      {
        ipAddressVersion: "IPV4",
        scope: "CLOUDFRONT",
        addresses: props.allowedIpV4AddressRanges,
      }
    );
    const ipV6SetReferenceStatement = new wafv2.CfnIPSet(
      this,
      "FrontendIpV6Set",
      {
        ipAddressVersion: "IPV6",
        scope: "CLOUDFRONT",
        addresses: props.allowedIpV6AddressRanges,
      }
    );

    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      defaultAction: { block: {} },
      name: "FrontendWebAcl",
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "FrontendWebAcl",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          priority: 0,
          name: "FrontendWebAclIpV4RuleSet",
          action: { allow: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "FrontendWebAcl",
            sampledRequestsEnabled: true,
          },
          statement: {
            ipSetReferenceStatement: { arn: ipV4SetReferenceStatement.attrArn },
          },
        },
        {
          priority: 1,
          name: "FrontendWebAclIpV6RuleSet",
          action: { allow: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "FrontendWebAcl",
            sampledRequestsEnabled: true,
          },
          statement: {
            ipSetReferenceStatement: { arn: ipV6SetReferenceStatement.attrArn },
          },
        },
      ],
    });

    this.webAclArn = new cdk.CfnOutput(this, "WebAclId", {
      value: webAcl.attrArn,
    });
    this.certificateArn = new cdk.CfnOutput(this, "CertificateArn", {value: certificate.certificateArn});
  }
}
