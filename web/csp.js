// @ts-check
// The Content-Security-Policy of the web app. CloudFront sends it (backend/infra/lib/app-stack.js); `vite preview` sends it too,
// so the e2e run of the built app (e2e/j4-offline.spec.js) fails on anything it would block.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
