# CommitWise

Upload-first personal finance prototype for GitHub Pages.

## What this version does

CommitWise starts with **no bundled financial demo data**. The dashboard is populated only from files the user uploads in the Statements screen.

Supported inputs:

- CSV bank statements
- XLSX / XLS spreadsheets
- Text-based and scanned PDFs
- Credit-card statement PDFs
- Payslip PDFs
- PNG / JPG / WEBP receipts and documents via OCR
- EML email receipts / payment alerts
- TXT payslip exports

All imported records are normalized into a common transaction schema in the browser.

## Import behavior

### Bank CSV / Excel
The importer searches for the real transaction header instead of assuming the first row is the header. It understands common columns such as:

- Date / Transaction Date
- Narration / Description / Transaction Details
- Withdrawal / Debit
- Deposit / Credit
- Reference numbers

Withdrawals become negative amounts and deposits become positive amounts.

### Credit-card PDFs
The importer recognizes the transaction table and handles:

- Purchases
- Refunds marked `Cr`
- Card payments / autopay as excluded transfers
- EMI transactions
- Recurring subscription signals

### Payslip PDFs
Payslip PDFs are detected separately. Net Pay is imported as an Income transaction; gross salary and individual deductions are not double-counted.

### EML receipts
Plain-text/base64 email receipts are decoded in-browser and the importer extracts the payment amount, date, merchant and subject where available.

## Data model

Transactions use fields including:

```text
id
date
amount
currency
raw_description
merchant
category
source
is_recurring
recurring_group_id
capturedLive
sourceType
excluded
```

## Privacy

There is no bank login or backend in this prototype. Uploaded data is processed in the browser and persisted in localStorage for the current browser.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## GitHub Pages

The Vite base path is configured for:

`https://ngoyal195.github.io/hack/`

GitHub Actions uses `npm install`, not `npm ci`, because this prototype intentionally does not require a committed npm lockfile.
