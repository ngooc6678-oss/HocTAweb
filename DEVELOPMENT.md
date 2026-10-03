# Development and deployment

This version uses native Next.js App Router and Supabase SSR, replacing the previous local Vinext/Cloudflare D1 runtime. The original local database is not part of this repository.

## Environment

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel before building. The legacy anon key can be supplied as `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never supply the Supabase service-role or secret key as a public environment variable. No admin key is needed by Wordnest.

Without environment variables the login page displays a setup notice; protected data operations remain unavailable. Set variables then redeploy so browser bundles receive them.

## Database and auth

Apply each file in `supabase/migrations/` using Supabase SQL Editor or the Supabase CLI. The UUID account owner is taken from a validated Supabase session; RLS policies enforce ownership independently of the API. All requests use the user's session, never privileged service credentials.

On Supabase, set the production Site URL to the stable Vercel domain. Add the app's `/auth/confirm` redirect URL to the allowed redirect list. Keep email confirmation enabled. For email signup confirmation, set the Confirm signup email link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Xác nhận tài khoản Wordnest</a>
```

Use the production domain as Site URL so confirmation works across devices. Do not allow unrestricted wildcard redirects. Supabase's default email service has delivery restrictions; public signup may require custom SMTP. For personal use, verify email delivery to the project owner's address before declaring the app ready.

## Verification

Run TypeScript, production build, and Node tests. In a provisioned test project, verify two separate accounts cannot read or update each other's words, import and retry duplicates, restore dates/progress, load over 1,000 rows, and sign out. Unit tests alone do not replace testing deployed auth/RLS.

Imports/restores and downloads are split into pages to stay below Vercel's request/response limits. Backups support up to 5,000 words and 15 MB; the UI validates before exporting or restoring. A failed paginated download must not be exported as a complete backup.

## Existing data

Restore the local JSON backup through the authenticated Wordnest UI. Keep the backup outside the repository. It contains the user's learning data and must not be packaged as a public seed file. Restoring existing words is safe: conflicts preserve the original saved progress and dates.
