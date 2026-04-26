# GHL Lead Import Tool — Project Reference

## Overview

A single-page application (SPA) hosted on Vercel that processes Turbomock lead list CSV files for bulk import into GoHighLevel (GHL). Remap and split happen in the browser. The optional **Import** action runs on a Vercel Function so the GHL Private Integration Token can stay server-side; only the function ever sees the token. The Import button is hidden behind a passphrase, so anonymous visitors can use the remap/split flow without ever touching the import path.

**Live URL:** https://ghl-lead-import-tool.vercel.app

**GitHub Repo:** https://github.com/Vantheos/ghl-lead-import-tool

---

## What It Does

1. User uploads a CSV file exported from Turbomock
2. The tool remaps column headers from Turbomock's naming convention to GHL's expected field names
3. Any columns that cannot be mapped are removed from the output
4. The remapped file is offered for download as `[original_filename]_GHL_ready.csv`
5. Optionally, the output can be split into smaller files of N leads each, packaged into a ZIP
6. Optionally (passphrase-gated, owner only), each split chunk can be imported directly into the configured GHL sub-account with a fixed tag applied to every contact
7. If an import returns partial failures, the row exposes a **Download** button that exports a `<chunk>_errors.csv` file containing only the failed contacts plus an `Import Error` column explaining each rejection

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool / dev server |
| Tailwind CSS | Styling |
| SheetJS (`xlsx`) | CSV parsing and generation |
| fflate | Client-side ZIP generation for split file feature |
| Vercel Functions (Node 24, Fluid Compute) | Server-side import endpoints (`api/unlock`, `api/import`) |

**Colours:**
- Background: `#0C121D`
- Surface: `#191E27`
- Blue (primary): `#3B8CCF`
- Emerald (Import action): `#047857`
- Burnt orange (warning text + error-CSV download): `#D97126`

---

## Repo Structure

```
ghl-lead-import-tool/
├── api/
│   ├── unlock.js                     # POST /api/unlock — validates passphrase
│   └── import.js                     # POST /api/import — pushes contacts to GHL
├── index.html                        # Entry point; references V-only favicon
├── package.json                      # Dependencies: react, xlsx, fflate, tailwind, vite
├── vite.config.js                    # Vite + React plugin config
├── tailwind.config.js                # Brand colour extensions
├── postcss.config.js                 # Tailwind + autoprefixer
├── public/
│   ├── vantheos_logo_horizontal_light.svg   # Header logo
│   └── vantheos_logo_V_only_light.svg       # Browser tab favicon
└── src/
    ├── main.jsx                      # React 18 root render
    ├── index.css                     # Tailwind directives
    ├── App.jsx                       # Root component; orchestrates state and layout
    ├── mapping.json                  # Visible column mappings (shown in reference table)
    ├── hiddenMapping.json            # Additional mappings (active but not shown in UI)
    ├── components/
    │   ├── Header.jsx                # Vantheos logo
    │   ├── Instructions.jsx          # Title, instructions, note about unmapped columns
    │   ├── UploadZone.jsx            # Drag-and-drop / click-to-browse CSV uploader
    │   ├── DownloadButton.jsx        # Reusable download card (blue styling)
    │   ├── SplitDownload.jsx         # Split-to-ZIP UI + per-file list with Download/Import + unlock gate + error-CSV export
    │   └── MappingTable.jsx          # Column mapping reference table (visible mappings only)
    └── utils/
        ├── remapCsv.js               # Core processing logic
        └── splitCsv.js               # CSV chunking and ZIP generation (returns parts array)
```

---

## Key Files Explained

### `src/mapping.json`
Defines the primary column mappings displayed in the on-page reference table. Keys are the original Turbomock column names; values are the GHL field names the output file will use.

### `src/hiddenMapping.json`
Contains additional mappings for alternate column name conventions (e.g. from different Turbomock export formats). These mappings are active — they will be applied if matched — but are intentionally excluded from the visible reference table on the page.

### `src/utils/remapCsv.js`
The core processing function. Key behaviours:
- Merges `mapping.json` and `hiddenMapping.json` into a single lookup
- **Matching is case-insensitive** on the input side (e.g. `Name`, `NAME`, `name` all match)
- Output column names are always written exactly as defined in the mapping
- Columns with no mapping match are **removed** from the output (not passed through)
- Returns the remapped CSV string and output filename

### `src/utils/splitCsv.js`
Handles the optional split feature:
- Takes the remapped CSV string and a leads-per-file count
- Splits data rows into sequential chunks, each with the header row prepended
- Packages all chunks into a ZIP using fflate's `zipSync`
- Also returns `parts: [{filename, csv, leadCount}]` so the UI can render and act on each chunk individually
- File naming pattern: `[base]_part_01_500leads.csv`, `_part_02_500leads.csv`, etc.

### `src/App.jsx`
Root component managing two pieces of state:
- `result` — output of `remapCsv()` after a file is processed (null until a file is uploaded)
- Renders: Header → Instructions → UploadZone → (on result) DownloadButton + SplitDownload → MappingTable

### `api/unlock.js`
Validates the user's passphrase against `GHL_IMPORT_PASSWORD`. Returns `200 {ok:true}` on match, `401 {ok:false}` (with a 400 ms delay) otherwise. Used by the SplitDownload UI to confirm the passphrase before revealing per-row Import buttons.

### `api/import.js`
Receives an array of contact objects from the browser, validates the `X-Import-Auth` header against `GHL_IMPORT_PASSWORD`, then POSTs each contact to `https://services.leadconnectorhq.com/contacts/` with the configured tag inline. Concurrency is limited to 5 to stay under GHL's per-location rate limit. Returns `{ ok, total, created, errors, droppedHeaders, unmappedCountries, customFieldsLoaded, customFieldFetchError }`. Per-row error entries carry `{ row, action: 'error', error }` where `row` is the 0-indexed position in the submitted `contacts` array (the header row is excluded by the client-side parser) and `error` is the raw `HTTP <status>: <body>` string truncated to 200 chars.

---

## Column Mapping Behaviour

| Scenario | Result |
|---|---|
| Column name matches a mapping key (any case) | Header is renamed to the mapped GHL field name |
| Column name matches a hidden mapping key (any case) | Same — renamed, not visible in reference table |
| Column name has no match in either mapping | Column is **removed** from output |
| Two source columns map to the same GHL field | Both are renamed; both appear in output |

---

## Import Error Handling

When `/api/import` returns one or more entries in `errors`, the affected row's status text shows `⚠ N new, M errors` and a burnt-orange **Download** button appears in the slot the Import button used to occupy. Clicking it produces `<chunk>_errors.csv` — the original headers + only the failed rows + a new `Import Error` column on the right.

The error column is built client-side by extracting `"message"` and (when present) `"matchingField"` from the raw GHL error string via regex. Regex is used instead of `JSON.parse` because the server truncates GHL responses to 200 chars (often mid-traceId), which breaks JSON parsing but leaves both target fields intact since they appear before the truncation point. Output format:
- With matching field: `This location does not allow duplicated contacts. — phone`
- Without: `Contacts without email, phone, firstName and lastName are not allowed.`
- Fallback (no `"message":` substring found): the raw error string is preserved unchanged

The CSV is prefixed with a UTF-8 BOM so Excel opens it as UTF-8 and renders the em-dash (and any non-ASCII lead data) correctly instead of as Windows-1252 mojibake.

---

## Server-side function — environment variables

The import path requires four env vars set on the Vercel project:

| Var | Purpose |
|---|---|
| `GHL_API_TOKEN` | GHL Private Integration Token. Required scopes: "View, Edit, and Delete Contacts" (`contacts.write`) and "View Custom Fields" (`locations/customFields.readonly`) — the latter is needed for the runtime UUID lookup that routes unknown headers to contact custom fields by name. Tags applied inline during create are covered by `contacts.write`. |
| `GHL_LOCATION_ID` | The Location/Sub-Account ID for the target sub-account. |
| `GHL_IMPORT_TAG` | The tag string stamped on every imported contact (e.g. `Turbomock-Import`). |
| `GHL_IMPORT_PASSWORD` | The passphrase that unlocks Import in the UI. Sent on every `/api/import` call as the `X-Import-Auth` header; validated against this var server-side. |

Without these set, the function returns `500` ("Server not configured") or `401` ("Unauthorized"). The remap/split flow continues to work with no env vars at all — those features remain pure client-side.

---

## Deployment

Deployed via Vercel's GitHub integration. Every push to `main` on `Vantheos/ghl-lead-import-tool` triggers an automatic build and deployment to production. Pushes to feature branches produce Vercel preview deployments at unique URLs — useful for spot-checking before merging.

---

## Development Workflow (Claude Code)

This project is developed entirely through Claude Code via the GitHub MCP. **There is no local clone in active use.** The repo on GitHub is the single source of truth, and Claude reads, writes, and commits files directly through MCP calls.

**Conventions:**

- **No local working tree.** Don't `git clone`, don't try to edit files at `D:/Dev/ghl-lead-import-tool` — any local copy is stale and divergent. All file operations go through `mcp__github__*` tools.
- **Feature work goes on a feature branch.** Branch from `main` (naming: `feat/<short-slug>` or `fix/<short-slug>`), commit changes there, then merge to `main` when verified. Vercel auto-deploys the branch as a preview URL during development.
- **`main` is reserved for production-ready commits.** Direct pushes to `main` are acceptable only for tiny mechanical changes (typo fixes, mapping JSON additions, doc tweaks) where a preview adds no value.
- **Plans live in `~/.claude/plans/`** (per-session, not in the repo). When picking up mid-feature work, reference the plan file path explicitly so the next session can resume from the same intent.
- **Vercel MCP** is connected to `ops@vantheos.com` / Vantheos team — useful for inspecting deployments, env vars, and logs without leaving Claude.

---

## Notes

- Remap and split are pure client-side; no data leaves the browser for those flows.
- Import (passphrase-gated) routes contact data through the Vercel Function — the GHL API token never touches the browser.
- The error-CSV export is also pure client-side: it re-parses the chunk CSV that's already in component state and slices it by `errors[].row` index. No additional server round-trip.
- The `.claude/launch.json` file configures the local dev server for previewing within Claude Code (`npm run dev` on port 5173).
- `node_modules/` and `dist/` are gitignored.
