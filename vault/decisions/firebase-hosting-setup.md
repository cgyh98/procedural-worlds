# Firebase project and hosting

**Status:** accepted (2026-10-04)

## Context
Class module 4 (backend) covers Firebase and Supabase. The project needs a public URL now, and later a place to save seeds, settings and painted maps.

## Options
- **Account:** school (cgy4@cornell.edu) vs. personal Google account.
- **Plan:** Spark (free, hard limits, no card) vs. Blaze (pay as you go, same free tier).
- **CLI:** global install vs. project dev dependency.

## Choice
- **Personal account** (gabriela.yaulli@gmail.com), project ID **`bioluminescent-ocean`**, live at https://bioluminescent-ocean.web.app
- **Spark plan.**
- **`firebase-tools` as a dev dependency**, deploy with `npm run deploy`.

## Why
- The school account sits under the cornell.edu organization ("select parent resource"): Cornell's policies apply, and the project would likely disappear after graduation. Moving later is easy for hosting but harder once data is stored, so we switched before storing anything.
- Pricing is identical for both accounts; Spark covers a class project and can never produce a bill. (Cloud Storage for file uploads may require Blaze; we can store maps as Firestore data instead, or add a budget alert if we ever switch.)
- A pinned CLI version in `package.json` makes deploys reproducible.

## How it's set up
- `firebase.json`: serve `dist/`, rewrite every URL to `index.html` (single-page app), long cache on hashed `/assets/**` files.
- `.firebaserc`: links the repo to `bioluminescent-ocean`.
- `src/backend/firebase.ts`: initializes the Firebase app from `VITE_FIREBASE_*` variables in `.env.local` (gitignored; template in `.env.example`). Not imported yet; the first saving feature will use it.
- The web config isn't truly secret (it ships in the browser bundle); data is protected by **Security Rules**, to be written when Firestore is added.

## Related
- [[ui-tabs-per-module]]
