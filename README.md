# AIRSHIFT
n**Live demo:** https://maymourad.github.io/airshift/ (all data simulated; deployed from `main` by `.github/workflows/deploy.yml`)

**Making the Invisible Visible. Turning Awareness into Action.**

A student-led clean-air initiative and interactive prototype for the Young Planet Leaders (YPL) Changemaker Academy 2026, *Vision to Action*.
Created by May Ahmed Mourad, Grade 12, ADNOC Schools Madinat Zayed, Al Dhafra, UAE (solo participant).

> **Status:** concept prototype. All room data is **synthetic demonstration data**. The Al Dhafra pilot is **proposed and subject to school approval**. Nothing here has been measured, approved, deployed or published.

**DETECT → DECIDE → VERIFY → REPLICATE**

## What is in this folder

| Path | What it is |
|---|---|
| `app/` | The React + TypeScript + Vite prototype (six modules) |
| `deck/AIRSHIFT_YPL_Pitch_Deck.pptx` | 10-slide, 16:9, editable pitch deck with speaker notes |
| `deck/AIRSHIFT_YPL_Pitch_Deck.pdf` | PDF export of the same deck (fonts embedded) |
| `deck/preview/` | PNG preview of each slide |
| `deck/build.mjs`, `deck/content.mjs` | The slide generator and the slide copy (edit, then rebuild) |
| `deck/export.ps1` | Exports PPTX to PDF and PNG using desktop PowerPoint |
| `deck/fonts/` | Space Grotesk, Inter and IBM Plex Mono TTFs (SIL OFL) needed to view the deck as designed |
| `screens/` | Real screenshots captured from the running prototype |
| `docs/DEMO_SCRIPT.md` | Two-minute prototype demonstration script |
| `docs/PITCH_SCRIPT.md` | Optional concise spoken pitch |
| `docs/SUBMISSION_TEXT.md` | Problem statement (207 words) and mission statement (45 words) as plain text |
| `docs/VERIFICATION_REPORT.md` | Technical and content verification, with limitations |

## Run the prototype

Requires Node.js 20+ (built and tested with Node 24). No API keys, accounts or paid services.

```bash
cd app
npm install
npm run dev        # development server on http://localhost:5173
```

Production build and local preview:

```bash
npm run build      # type-checks, then builds to app/dist
npm run preview    # serves the build on http://localhost:4173
```

Automated browser tests (needs Microsoft Edge; change `channel` in `scripts/e2e.mjs` to use another Chromium):

```bash
npm run preview &  # in one terminal
npm run test:e2e   # 49 checks: navigation, controls, CSV validation, exports, mobile, reduced motion
```

Regenerate the screenshots used in the deck: `npm run capture`.

## The six modules

1. **Landing** — cinematic particle field, WHO statistic with source and caveat, links to the Air Lab and the proposed pilot.
2. **Air Lab** — 3D classroom (React Three Fiber). Orbit, select zones, change outdoor PM2.5, ventilation, indoor sources and occupancy, toggle a hypothetical HEPA cleaner. Concentrations come from a documented single-zone mass balance; particle motion is conceptual, not CFD. CO2 is shown as a separate metric that filtration does not change.
3. **School Air Map** — illustrative floorplan, per-room PM2.5 (µg/m³), time series with the WHO 24-hour reference, data-source labels and timestamps, CSV import with validation (rejects name-like columns).
4. **Intervention Studio** — room dimensions, budget ($500 / $1,000 / $1,500), observations. Sizes portable HEPA against the EPA CADR rule of thumb, ranks three options with a transparent rule-based score, gives a rounded modelled range with its assumptions.
5. **Evidence Lab** — before/after statistics, bootstrap interval from daily means, indoor ÷ outdoor ratio, comparison-room check, computed data-quality warnings, exportable sample report (HTML) and data (CSV), both marked SIMULATED for demo data.
6. **Global Replication** — the four stages, proposed pilot, eight-week plan, checklist, downloadable templates, budget options, and an interactive globe where every non-pilot marker is labeled hypothetical.

## Honesty rules built into the product

- Synthetic data is labeled everywhere it appears and in every export.
- Planned activities, proposed targets, hypothetical scenarios and verified outcomes are kept apart. Verified outcomes: **none**.
- No student-identifiable data is collected. CSV files with name-like columns are rejected. Imports never leave the browser.
- No medical diagnosis or health-risk prediction.
- Costs are preliminary planning figures, not supplier quotations.

## Edit the deck

```bash
cd deck
npm install                       # first time only
# install the three fonts in deck/fonts (double-click each .ttf, "Install")
node ../app/scripts/capture-deck.mjs   # optional: refresh screenshots (preview server must be running)
node build.mjs                    # writes AIRSHIFT_YPL_Pitch_Deck.pptx
powershell -ExecutionPolicy Bypass -File export.ps1   # PDF + PNG previews (needs PowerPoint)
```

Slide copy lives in `deck/content.mjs` (problem statement, mission, budget, speaker notes) and layout in `deck/build.mjs`. The PPTX is native shapes and text, so it can also be edited directly in PowerPoint.

## Deploy later (not done; nothing has been published)

When you decide to publish:

1. Create a GitHub repository and push this folder (`app/` has its own `.gitignore`).
2. In Vercel, import the repository and set **Root Directory** to `app`. Framework preset **Vite**, build command `npm run build`, output directory `dist`. No environment variables are needed.
3. Add the resulting URL to slide 6 of the deck (the "Live demo" box) and rebuild or edit the slide.

## Sources

- WHO, Air pollution — https://www.who.int/health-topics/air-pollution
- WHO global air quality guidelines (2021) — https://www.who.int/publications/i/item/9789240034228
- US CDC/NIOSH, Ventilation in Schools and Childcare Programs — https://www.cdc.gov/niosh/ventilation/guidelines/
- US EPA, Guide to Air Cleaners in the Home — https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home
- Alhebsi et al. (2025), ISPRS Archives XLVIII-4/W17 — https://doi.org/10.5194/isprs-archives-XLVIII-4-W17-2025-13-2026
- IQAir, United Arab Emirates — https://www.iqair.com/united-arab-emirates

See `docs/VERIFICATION_REPORT.md` for exactly what each source was used for and what was and was not verified.
