// @ts-check
// The CDK app: `npm run synth` builds and synthesizes with no AWS account; `npx cdk deploy` deploys (docs/TASKS.md, M6).
import { App } from 'aws-cdk-lib'
import { AppStack } from '../lib/app-stack.js'
import { DataStack } from '../lib/data-stack.js'
import { resolveStage } from '../lib/stages.js'

const stage = resolveStage(process.env.STAGE)
const app = new App({ outdir: process.env.CDK_OUTDIR ?? 'cdk.out' })
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.AWS_REGION ?? 'ap-south-1' }

const data = new DataStack(app, `OnePercent-${stage.name}-Data`, { env, stage })
new AppStack(app, `OnePercent-${stage.name}-App`, { env, stage, table: data.table })

app.synth()
