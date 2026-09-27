# CommitWise

Upload-first personal finance prototype for GitHub Pages.

## Data sources

CommitWise does **not** ship with demo financial transactions. A fresh browser starts empty. Users import their own files from Statements.

Supported uploads:
- CSV bank statements
- XLSX / XLS spreadsheets
- Text-based PDF bank statements
- Scanned/image PDFs through OCR fallback
- PNG / JPG / JPEG / WEBP receipts and scanned documents through OCR
- TXT payslip exports

All supported inputs are normalized into one transaction schema before dashboard calculations.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

The repository is configured for `https://<user>.github.io/hack/` with Vite `base: "/hack/"`.

The GitHub Actions workflow builds `dist` and deploys it through GitHub Pages.
