# GHL Lead Import Tool

A web app that takes Turbomock lead-list CSV exports, remaps the column headers to GoHighLevel's expected field names, optionally splits the output into smaller chunks, and (for the owner) imports each chunk straight into a configured GHL sub-account with a fixed tag applied.

**Live:** https://ghl-lead-import-tool.vercel.app

## What it does

- **Remap** — drag in a Turbomock CSV; the tool renames columns case-insensitively to the GHL field names defined in [src/mapping.json](src/mapping.json) and [src/hiddenMapping.json](src/hiddenMapping.json), and drops anything unmapped. Output downloads as `<original>_GHL_ready.csv`.
- **Split** — optionally break the output into chunks of N leads per file (e.g. 500), bundled into a ZIP.
- **Per-file list** — a checkbox renders each chunk individually with **Download** and **Import** buttons.
- **Import** (passphrase-gated, owner only) — pushes each chunk's contacts into a fixed GHL sub-account via a Vercel Function. Standard fields go to GHL's typed columns; everything else routes to matching contact custom fields by name. Every imported contact gets a fixed tag stamped on it.

## Stack

React 18 · Vite · Tailwind CSS · SheetJS (xlsx) · fflate (ZIP) · Vercel Functions (Node 24, Fluid Compute)

## More

See [PROJECT.md](PROJECT.md) for the full repo structure, file-by-file responsibilities, env-var reference (`GHL_API_TOKEN`, `GHL_LOCATION_ID`, `GHL_IMPORT_TAG`, `GHL_IMPORT_PASSWORD`), and the developer workflow.
