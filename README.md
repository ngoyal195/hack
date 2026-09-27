# CommitWise

CommitWise is a GitHub Pages-friendly React/Vite prototype for understanding free-to-spend money after recurring commitments.

## Ingestion capabilities

The browser ingestion pipeline now supports:

- CSV bank statements
- XLSX / XLS spreadsheets
- Text-based PDF bank statements
- PNG / JPG / JPEG / WEBP receipt or document OCR
- TXT payslip exports containing net salary fields

All statement-like inputs are normalised into one transaction schema with date, signed amount, raw description, merchant, category, source, recurring signal, recurring group and confidence.

### Important limitations

- PDF extraction first tries the text layer and automatically falls back to browser OCR for scanned/image-only PDF pages. OCR results should still be reviewed because bank layouts vary.
- Receipt OCR is intentionally heuristic: it extracts the most plausible date, total and merchant and exposes a confidence level.
- XLS/XLSX parsing handles tabular exports; bank-specific layouts may still need a bank adapter.
- There is no direct bank login/API connection. Files are processed in the browser.
- Payslip support currently handles text exports. A production version should add PDF payslip extraction and a dedicated salary document schema.

## Run locally

```bash
npm install
npm run dev
```

## GitHub Pages

The Vite base is configured for the repository path `/hack/`. If the repository name changes, update `vite.config.js` accordingly.


## Upload-first data model

CommitWise does not use a bundled financial dataset for the dashboard. On a fresh browser session the transaction, subscription, and commitment stores are empty. Upload files from **Statements** to populate the app.

Supported uploads: CSV, XLSX/XLS, digital or scanned PDF, PNG/JPG/JPEG/WEBP receipt images, and TXT payslips. Imported transactions are normalized into the common transaction schema in `src/ingestion/`.

The old demo dataset is intentionally excluded from this version.
