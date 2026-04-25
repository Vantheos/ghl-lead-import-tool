# GHL Lead Import Tool — Project Reference

## Overview

A client-side single-page application (SPA) hosted on Vercel that processes Turbomock lead list CSV files for bulk import into GoHighLevel (GHL). All processing happens in the browser — no backend, no server, no data is ever uploaded anywhere.

**Live URL:** https://ghl-lead-import-tool.vercel.app

**GitHub Repo:** https://github.com/Vantheos/ghl-lead-import-tool

---

## What It Does

1. User uploads a CSV file exported from Turbomock
2. The tool remaps column headers from Turbomock's naming convention to GHL's expected field names
3. Any columns that cannot be mapped are removed from the output
4. The remapped file is offered for download as `[original_filename]_GHL_ready.csv`
5. Optionally, the output can be split into smaller files of N leads each, packaged into a ZIP

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool / dev server |
| Tailwind CSS | Styling |
| SheetJS (`xlsx`) | CSV parsing and generation |
| fflate | Client-side ZIP generation for split file feature |

**Colours:**
- Background: `#0C121D`
- Surface: `#191E27`
- Blue (primary): `#3B8CCF`
- Orange (warning): `#D97126`

---

## Repo Structure

```
ghl-lead-import-tool/
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
    │   ├── SplitDownload.jsx         # Optional split-to-ZIP feature UI
    │   └── MappingTable.jsx          # Column mapping reference table (visible mappings only)
    └── utils/
        ├── remapCsv.js               # Core processing logic
        └── splitCsv.js               # CSV chunking and ZIP generation
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
- File naming pattern: `[base]_part_01_500leads.csv`, `_part_02_500leads.csv`, etc.
- Returns a Blob, ZIP filename, and part count

### `src/App.jsx`
Root component managing two pieces of state:
- `result` — output of `remapCsv()` after a file is processed (null until a file is uploaded)
- Renders: Header → Instructions → UploadZone → (on result) DownloadButton + SplitDownload → MappingTable

---

## Column Mapping Behaviour

| Scenario | Result |
|---|---|
| Column name matches a mapping key (any case) | Header is renamed to the mapped GHL field name |
| Column name matches a hidden mapping key (any case) | Same — renamed, not visible in reference table |
| Column name has no match in either mapping | Column is **removed** from output |
| Two source columns map to the same GHL field | Both are renamed; both appear in output |

---

## Deployment

Deployed via Vercel's GitHub integration. Every push to `main` on `Vantheos/ghl-lead-import-tool` triggers an automatic build and deployment. No manual deploy step required.

The GitHub MCP (connected to the Vantheos account) is used to push file changes directly from Claude Code without needing local git credentials.

---

## Notes

- The tool is entirely client-side. No data leaves the browser.
- The `.claude/launch.json` file configures the local dev server for previewing within Claude Code (`npm run dev` on port 5173).
- `node_modules/` and `dist/` are gitignored.
