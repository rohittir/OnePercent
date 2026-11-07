// @ts-check
// The API Lambda behind an HTTP API, the web and content buckets, and the CloudFront distribution that serves all three from one origin:
// /api/* → the HTTP API, /content/* → the content bucket, everything else → the web app (docs/ARCHITECTURE.md, "Infrastructure").
import { existsSync } from 'node:fs'
import path from 'node:path'
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { CSP } from '../../../web/csp.js'

const API_DIST = path.resolve(import.meta.dirname, '../../dist')
const WEB_DIST = path.resolve(import.meta.dirname, '../../../web/dist')

// Any path without a dot is a page of the single-page app.
const SPA_REWRITE = `function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('.') === -1) request.uri = '/index.html';
  return request;
}`

export class AppStack extends Stack {
  /**
   * @param {import('constructs').Construct} scope
   * @param {string} id
   * @param {import('aws-cdk-lib').StackProps & {
   *   stage: ReturnType<typeof import('./stages.js').resolveStage>,
   *   table: import('aws-cdk-lib/aws-dynamodb').ITable,
   *   domain?: { name: string, certificateArn: string },
   * }} props
   */
  constructor(scope, id, { stage, table, domain, ...props }) {
    super(scope, id, props)
    if (!existsSync(path.join(WEB_DIST, 'index.html'))) throw new Error('web/dist is missing: build the web app first (the root `npm run synth` and `npm run deploy` do)')

    // --- API ---
    const fn = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'api.handler',
      code: lambda.Code.fromAsset(API_DIST),
      memorySize: 512,
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: table.tableName, NODE_OPTIONS: '--enable-source-maps' },
      logGroup: new logs.LogGroup(this, 'ApiLogs', { retention: stage.logRetentionDays, removalPolicy: RemovalPolicy.DESTROY }),
    })
    table.grantReadWriteData(fn)

    const api = new apigwv2.HttpApi(this, 'HttpApi', { apiName: `onepercent-${stage.name}`, createDefaultStage: false })
    // Not the id 'Default': CDK drops it from logical ids, which would clash with the API's own.
    api.addStage('DefaultStage', { stageName: '$default', autoDeploy: true, throttle: stage.throttle })
    api.addRoutes({ path: '/api/{proxy+}', methods: [apigwv2.HttpMethod.ANY], integration: new HttpLambdaIntegration('Api', fn) })

    // --- Buckets: private, reached only through CloudFront. Kept on stack deletion; emptying them is the owner's step (RUNBOOK). ---
    const bucket = (/** @type {string} */ name) => new s3.Bucket(this, name, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, enforceSSL: true, encryption: s3.BucketEncryption.S3_MANAGED, removalPolicy: RemovalPolicy.RETAIN,
    })
    const webBucket = bucket('WebBucket')
    const contentBucket = bucket('ContentBucket')

    // --- CloudFront ---
    const headers = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: CSP, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
      },
    })
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      ...(domain && { domainNames: [domain.name], certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', domain.certificateArn) }),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: headers,
        functionAssociations: [{
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          function: new cloudfront.Function(this, 'SpaRewrite', { code: cloudfront.FunctionCode.fromInline(SPA_REWRITE), runtime: cloudfront.FunctionRuntime.JS_2_0 }),
        }],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(Fn.select(2, Fn.split('/', api.apiEndpoint))),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: headers,
        },
        '/content/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(contentBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: headers,
        },
      },
    })

    // --- The web app: hashed files cached for a year, everything else (index.html, sw.js, the manifests) checked on every load. ---
    new s3deploy.BucketDeployment(this, 'WebAssets', {
      sources: [s3deploy.Source.asset(WEB_DIST, { exclude: ['*', '!assets', '!assets/**'] })],
      destinationBucket: webBucket,
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=31536000, immutable')],
      prune: false,
    })
    new s3deploy.BucketDeployment(this, 'WebPages', {
      sources: [s3deploy.Source.asset(WEB_DIST, { exclude: ['assets', 'assets/**'] })],
      destinationBucket: webBucket,
      cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
      prune: false,
      distribution,
      distributionPaths: ['/*'],
    })

    new CfnOutput(this, 'SiteUrl', { value: `https://${domain?.name ?? distribution.distributionDomainName}` })
    new CfnOutput(this, 'ContentBucketName', { value: contentBucket.bucketName })
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId })
  }
}
