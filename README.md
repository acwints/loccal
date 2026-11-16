# Loccal App

This app ports your Apps Script logic into a Next.js web app.

## What it does

- Sign in with Google.
- Read all calendars you can access.
- Rebuild the same location-rollup logic from your script (city/state/country inference, airport filtering, all-day range merges, and per-day aggregation).
- Show a monthly calendar view of inferred location by day.
- Add friends, approve/deny requests, and compare overlap dates where you and friends are in the same city.

## Setup

1. Create a Google Cloud OAuth app.
2. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs.
3. Provision PostgreSQL and set `DATABASE_URL`.
4. Copy `.env.example` to `.env.local` and fill values.
5. Install deps, generate Prisma client, run migrations, and start:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`.

## Mobile

Loccal includes an installable mobile web app using the same Google sign-in and backend as the website. Deploy over HTTPS, then:

- iPhone: open in Safari, tap Share, then **Add to Home Screen**.
- Android: open in Chrome and choose **Install app** or **Add to Home screen** from its menu.

The phone layout includes Calendar, Friends, and Settings tabs, a compact month grid, and day details in a bottom sheet. Tap a day to read full city names and friend matches. Calendar and friend data require a connection; only a static reconnect page is cached. The service worker runs in production, so use `npm run build` and `npm start` to check offline behavior locally. Run `npm run test:mobile` for the worker checks.

## iPhone app

The `ios/` Xcode project packages Calendar, Friends, and Settings in a Capacitor shell. It loads the existing production website at `https://loccal-web.vercel.app`; the Next.js server and database remain the backend.

```bash
npm ci
npm run ios:sync
npm run ios:open
```

In Xcode, choose your signing team and an iPhone, then Run. The bundle ID is `app.loccal.ios`. For a local iOS Simulator build, set `LOCCAL_APP_URL=http://localhost:3000 npm run ios:sync` while the local web server runs. Run `npm run ios:sync` without the override again before distributing.

Google sign-in opens an `ASWebAuthenticationSession`. After the usual web OAuth callback, a 60-second encrypted ticket bound to the initiating app's HttpOnly verifier cookie transfers the session into the app. The ticket uses a separate encryption context from normal sessions. The verifier is removed after successful redemption. No new Google OAuth client is needed; keep the existing HTTPS `/api/auth/callback/google` redirect configured.

Deploy the updated Next.js app before using the production iPhone shell: it needs `/mobile/sign-in`, `/mobile/complete`, and `/api/mobile/*`. Set `NEXTAUTH_URL` to the exact app origin and configure `NEXTAUTH_SECRET`, Google OAuth credentials, and the database as usual. Google login and live calendar data cannot be tested with build-only placeholder credentials.

Apple signing uses team `VRTT45LLND`, the existing Apple Distribution certificate, and the `Loccal App Store` provisioning profile. App Store Connect app `6834292831` is named **Loccal: Calendar & Friends** (the shorter store name was already taken). The name on the phone remains Loccal.

Archive and export with the configured signing assets:

```bash
/Users/andrewwinter/.local/bin/heavy-build bash scripts/archive-ios.sh
```

The script builds outside synced Documents to avoid file-provider metadata breaking signatures. The signed IPA is saved to `ios/build/export/Loccal.ipa`; `ios/build/archive-location.txt` points to the retained archive. Build output is ignored by Git. Increment `CURRENT_PROJECT_VERSION` before uploading another build.

TestFlight distribution uses the Personal ASC profile and the **Internal testing** group:

```bash
asc --profile Personal publish testflight --app 6834292831 \
  --ipa ios/build/export/Loccal.ipa --group b57c0872-be3d-43a0-a9ca-9cbe5aeb6917 --wait
```

Release records are stored in `ios/release/`. This workflow does not submit an App Store release or enable a public beta link.

Version **1.0 (1)** was uploaded on 12 November 2026. Apple processing completed as **VALID**, and its internal build state is **IN_BETA_TESTING**. The build is assigned to **Internal testing**, with the account holder invited as its sole tester. The required backend changes are live at `https://loccal-web.vercel.app`. See `ios/release/build-1.json` for the signed IPA digest and App Store Connect identifiers. Live Google sign-in and physical-device behavior remain unverified.

Optional one-time import if you already used the file-backed social store:

```bash
npm run db:import-social-json
```

## Notes

- Scope used: `https://www.googleapis.com/auth/calendar.readonly`
- Data range mirrors your script: from 30 days ago to 365 days ahead.
- Generated detail strings include Google Maps links and event timing.
- Location inference now validates candidate locations with geocoding before including them in the monthly rollup.
- Friend graph and month snapshots are persisted in Postgres via Prisma.
- Snapshot sharing is controlled per-user (`friends` or `private`) in Settings.
- Stale-snapshot threshold defaults to 72 hours (`LOCCAL_SNAPSHOT_STALE_HOURS`).

## Troubleshooting

- If you see `client_id is required` during Google sign-in, set Google OAuth env vars in your deploy target:
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (primary)
  - or `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (also supported)
- For stronger location validation in production, set `GOOGLE_MAPS_GEOCODING_API_KEY`.
