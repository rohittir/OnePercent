// @ts-check
// The CDK app. `npm run synth` (root) builds and synthesizes with no AWS account; `npm run deploy` (root) deploys (docs/RUNBOOK.md).
// Stage values come from the environment, never from a file: STAGE, AWS_REGION, and optionally DOMAIN_NAME with CERTIFICATE_ARN (us-east-1).
import { App } from 'aws-cdk-lib'
import { AppStack } from '../lib/app-stack.js'
import { DataStack } from '../lib/data-stack.js'
import { resolveStage } from '../lib/stages.js'

const stage = resolveStage(process.env.STAGE)
const app = new App({ outdir: process.env.CDK_OUTDIR ?? 'cdk.out' })
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.AWS_REGION ?? 'ap-south-1' }
const { DOMAIN_NAME, CERTIFICATE_ARN } = process.env
if (Boolean(DOMAIN_NAME) !== Boolean(CERTIFICATE_ARN)) throw new Error('Set both DOMAIN_NAME and CERTIFICATE_ARN, or neither')

const data = new DataStack(app, `OnePercent-${stage.name}-Data`, { env, stage })
new AppStack(app, `OnePercent-${stage.name}-App`, {
  env, stage, table: data.table,
  ...(DOMAIN_NAME && CERTIFICATE_ARN && { domain: { name: DOMAIN_NAME, certificateArn: CERTIFICATE_ARN } }),
})

app.synth()
