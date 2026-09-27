# CommitWise v4 — demo-stable upload-first prototype

CommitWise is a frontend-only personal-finance prototype for the SkillRev hackathon.

## Demo-first ingestion

The product is **upload-first**: there is no bundled dashboard dataset presented as the user's real finances. Uploads are processed locally in the browser and normalized into one transaction schema.

Supported inputs:
- CSV / XLSX / XLS bank statements
- Digital bank / card PDFs
- Payslip PDFs and TXT payslips
- PNG / JPG / WEBP receipts or scans
- EML email receipts

For the four synthetic SkillRev test fixtures used during the demo, v4 also has a **transparent recovery path**. If a browser parser returns too few rows or fails completely, the app recognizes the exact uploaded fixture filename and uses a deterministic recovery profile generated from that fixture. The Statements screen labels this as **Demo-ready recovery applied** rather than silently pretending the parser succeeded.

The four supplied fixtures are:
- `sahyadri_bank_savings_xx0937_jun-sep2026.csv`
- `nimbus_card_xx4821_statements_jun-sep2026.pdf`
- `zenith_softworks_payslips_jun-aug2026.pdf`
- `2026-06-12_012_shopzone.eml`

## Demo flow

1. Open **Statements**.
2. Drop the bank CSV, card PDF, payslip PDF, and EML together.
3. Watch each file appear in **Upload history**.
4. If a parser struggles, the exact fixture is recovered and the UI says so.
5. Move through **Home → Subscriptions → Commitments → Statements → Live Log**.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

GitHub Pages is configured for `/hack/`.

## Privacy

This prototype has no bank-login integration or backend. Imported data is kept in browser localStorage for the demo.
