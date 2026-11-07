# OnePercent runbook

How to run, deploy, publish content, roll back and remove a stage. Real account ids, domains and ARNs go in the environment of a command or in a GitHub environment, never in a file.

## Run locally

| Step | Command |
| --- | --- |
| Install | `npm ci && npm ci --prefix backend` |
| Start DynamoDB Local (port 8100) | `npm run stack:up` |
| Start the API (port 4100) | `npm run dev` |
| Start the web app (port 5180) | `npm run dev:web`, then open http://localhost:5180 |
| Checks | `npm run lint`, `npm test`, `npm run test:int`, `npm run synth`, `npm run e2e` |
| Stop DynamoDB Local | `npm run stack:down` (it is in memory: its data goes) |

`npm run e2e` starts the API, the dev server and a production build of the web app itself; DynamoDB Local must be up. It reuses servers that are already running.

## First deploy of a stage (owner, once per AWS account and region)

1. Pick the region (the default is `ap-south-1`) and configure the AWS CLI profile on your machine.
2. Bootstrap CDK: `cd backend && npx cdk bootstrap aws://<account>/<region>`.
3. Optional domain: request a certificate for it in ACM in `us-east-1` and validate it.
4. Deploy from your machine:

```
STAGE=dev AWS_REGION=<region> npm run deploy
```

With a domain, add `DOMAIN_NAME=<name> CERTIFICATE_ARN=<arn>`, then point the domain's DNS (a CNAME or alias) at the distribution in the `SiteUrl` output.

The outputs give `SiteUrl`, `ContentBucketName` and `DistributionId`.

## Deploy from GitHub

1. In the AWS account, add GitHub's OIDC provider and a role that `repo:rohittir/OnePercent:environment:<stage>` may assume, with the rights CDK needs (the CDK bootstrap roles).
2. In the repository settings, make the environments `dev` and `prod`, each with the variables `AWS_DEPLOY_ROLE_ARN` and `AWS_REGION`, and optionally `DOMAIN_NAME` and `CERTIFICATE_ARN`. Protect `prod` with a required reviewer.
3. Run the Deploy workflow by hand and pick the stage. It runs the tests first.

## Publish content

1. Add or edit a pack in `content/<type>/<id>.json`. `npm run content:publish` with no bucket only checks and builds it.
2. Upload: `CONTENT_BUCKET=<ContentBucketName output> npm run content:publish`.
3. Apps pick the packs up on their next open; the manifest is cached for a minute. A pack with the id of a bundled one replaces it.

To take a pack down, delete its file and publish again: the manifest stops listing it and apps drop it from their cache.

## Roll back

Deploy the last good commit: check it out, then deploy as above. Data is not touched by a deploy. On prod the table has point-in-time recovery for 35 days (AWS console, DynamoDB, the table, Backups).

## Remove a stage (owner only)

Stacks keep their buckets, and the prod table has deletion protection. To remove `dev`:

```
cd backend && STAGE=dev npx cdk destroy --all
```

Then empty and delete the two retained buckets in the S3 console. Never run this against prod without a backup.
