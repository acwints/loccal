# Loccal Web App

This app ports your Apps Script logic into a Next.js web app.

## What it does

- Sign in with Google.
- Read all calendars you can access.
- Rebuild the same location-rollup logic from your script (city/state/country inference, airport filtering, all-day range merges, and per-day aggregation).
- Show a monthly calendar view of inferred location by day.

## Setup

1. Create a Google Cloud OAuth app.
2. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs.
3. Copy `.env.example` to `.env.local` and fill values.
4. Install deps and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Scope used: `https://www.googleapis.com/auth/calendar.readonly`
- Data range mirrors your script: from 30 days ago to 365 days ahead.
- Generated detail strings include Google Maps links and event timing.
