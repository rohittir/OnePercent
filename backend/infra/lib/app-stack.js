// @ts-check
// The API Lambda behind an HTTP API. M6 adds the web bucket and the CloudFront distribution in front of both.
import path from 'node:path'
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'

const DIST = path.resolve(import.meta.dirname, '../../dist')

export class AppStack extends Stack {
  /**
   * @param {import('constructs').Construct} scope
   * @param {string} id
   * @param {import('aws-cdk-lib').StackProps & { stage: ReturnType<typeof import('./stages.js').resolveStage>, table: import('aws-cdk-lib/aws-dynamodb').ITable }} props
   */
  constructor(scope, id, { stage, table, ...props }) {
    super(scope, id, props)

    const fn = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'api.handler',
      code: lambda.Code.fromAsset(DIST),
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

    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint })
  }
}
