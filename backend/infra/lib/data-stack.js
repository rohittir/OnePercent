// @ts-check
// The table. M4 adds the content bucket here.
import { RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

export class DataStack extends Stack {
  /**
   * @param {import('constructs').Construct} scope
   * @param {string} id
   * @param {import('aws-cdk-lib').StackProps & { stage: ReturnType<typeof import('./stages.js').resolveStage> }} props
   */
  constructor(scope, id, { stage, ...props }) {
    super(scope, id, props)
    // Keys only: src/data/schema.js spells them (CLAUDE.md, rule 4).
    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: stage.pitr },
      deletionProtection: stage.retain,
      removalPolicy: stage.retain ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    })
  }
}
