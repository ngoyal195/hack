# CommitWise

A GitHub Pages-friendly hackathon prototype for understanding committed spending before it happens.

## Features

- Home: free-to-spend headline, committed outflows, spent amount
- Live Log: paste/share a payment and tag it
- Commitments: next 30 days of fixed/recurring outflows
- Subscriptions: recurring charges, annual/monthly cost, forgotten/price-hike flags
- Statements: CSV upload, transaction reconciliation, uncaptured-charge flags
- Local persistence with `localStorage`
- Deterministic CSV parsing using Papa Parse
- No backend required for the demo

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

The Vite config uses `base: "./"`, so the built app works when served from a GitHub Pages project URL.

1. Push the project to GitHub.
2. Run `npm install`.
3. Run `npm run build`.
4. Deploy the `dist/` folder using GitHub Pages, or configure a GitHub Actions Pages workflow.

For a hackathon, the app intentionally keeps data local. Real bank/LLM ingestion should be added behind a backend later; never put bank credentials or API secrets in this frontend.
