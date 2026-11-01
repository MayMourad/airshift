# AIRSHIFT — technical and content verification report

Date of verification: 1 November 2026. Submission deadline: Thursday 5 November 2026.
Scope: the prototype in `app/`, the deck in `deck/`, and the statements in both.

## 1. Summary

| Area | Result |
|---|---|
| Prototype builds (`tsc -b` + `vite build`) | Pass |
| Automated browser tests (`scripts/e2e.mjs`) | **49 / 49 pass** (Microsoft Edge, Chromium) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Lint (`oxlint`) | 0 errors, a few advisory warnings (see §6) |
| Deck | 10 slides, 16:9, PPTX + PDF, speaker notes on every slide, fonts embedded in the PDF |
| Problem statement | 207 words (target ≈ 200) |
| Mission statement | 45 words (target ≈ 50) |
| Published anywhere | **No.** Nothing was uploaded, pushed or deployed |

## 2. What was tested, and how

Playwright drove a real Edge browser against the production build (`vite preview`).

- **Navigation:** hero call-to-action, secondary "proposed pilot" link, all six nav links, logo, mobile menu.
- **Air Lab:** 3D canvas mounts; HEPA toggle changes the modelled steady state (32.0 → 11.6 µg/m³ at defaults); CO2 is identical with the cleaner on and off (1,860 ppm); zone selection; "Dust event" preset raises the value; reset restores defaults.
- **School Air Map:** room selection, window switch, synthetic label present; CSV with a name-like column is rejected; CSV with invalid rows is refused with row-level errors; a valid CSV is accepted, labeled "Your imported data", and feeds the Evidence Lab (which asks for the intervention date first, then computes).
- **Intervention Studio:** the budget selector changes coverage (114% at $1,500 → 41% at $500 for a 7×6×3 m room); the $500 table totals $500; observations re-rank options; a baseline ≤ 15 µg/m³ triggers the "may not be warranted" note; a bigger room lowers coverage.
- **Evidence Lab:** simulated badge; the outdoor-confounding warning appears; sample report downloads as `airshift-SIMULATED-sample-report.html` and contains the SIMULATED banner; data CSV download.
- **Replication:** globe renders; hypothetical markers are labeled; checklist progress; week selector; template download.
- **Responsive:** at a 390 px viewport there is no horizontal page overflow at the top of the page or at each of the six sections; mobile menu opens and navigates.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the page loads and the 3D scene mounts without errors.
- **Console:** no console errors in the main run.

Numbers were also checked by hand against the model: with 7×6×3 m (126 m³), 2 air changes/h, 40 µg/m³ outdoors, light sources: C = (0.8·2·40 + 800/126) ÷ (2 + 0.2) = 32.0 µg/m³; with 700 m³/h rated CADR at 70% delivery: ÷ (2.2 + 0.7·700/126 = 6.09) → 11.6 µg/m³. EPA rule: 65 cfm per 100 ft² ≈ 11.9 m³/h per m² × 42 m² × (3 m ÷ 2.44 m) = 614 m³/h.

## 3. Claims audit

| Claim in prototype or deck | Basis | Status |
|---|---|---|
| "Almost all of the global population (99%) breathe air that exceeds WHO guideline limits" | WHO *Air pollution* page, fetched 1 Nov 2026 (no year printed on the page) | Verified against the page. Global, outdoor. |
| "~7 million premature deaths annually, ambient + household combined" | Same WHO page | Verified. The page also lists a June 2026 publication saying "about 6.6 million" for air pollution deaths; the deck uses the main page's wording, "about 7 million". |
| PM2.5 guideline 5 µg/m³ annual, 15 µg/m³ 24-hour; 37.5 µg/m³ 24-hour interim target 3 | WHO Global Air Quality Guidelines 2021 | **Partly verified.** The WHO pages I fetched did not print the table (it is an image). The 5 and 15 values were confirmed on secondary sources (e.g. DieselNet) and match my own knowledge of the 2021 guideline; 37.5 is from my knowledge of the WHO interim-target table and was **not** re-confirmed this session. Please check both against the WHO table before presenting. |
| CADR rule: 65 cfm per 100 ft² at 8-ft ceilings | EPA *Guide to Air Cleaners in the Home* | Verified (table fetched). EPA writes it for homes; applying it to a classroom is my adaptation and is labeled "rule of thumb". |
| Air cleaners supplement source control and ventilation; avoid ozone-emitting units; replace filters | EPA page | Verified. |
| HVAC upkeep, filtration "as much as possible without significantly reducing airflow", portable HEPA as a supplement | CDC/NIOSH page | Verified. |
| HEPA filtration does not remove CO2 | Not stated on the EPA page (it only says CADR applies to particles). Standard physics of particle filters; not cited to a source. | Stated as a design principle. Add a citation if a judge asks. |
| "Desert dust is a major natural particulate source in Abu Dhabi emirate"; PM2.5/PM10 generally below 0.5 | Alhebsi et al. 2025, ISPRS Archives (full text read) | Verified. Outdoor and regional; the paper covers 2022 data from 20 stations. |
| UAE 2025 annual PM2.5 36.4 µg/m³, 7.3× WHO guideline | IQAir UAE page, fetched 1 Nov 2026 | Verified on the page. National, outdoor, private data provider. Used as context only. |
| Budget lines for $1,500 | Your idea brief | Copied exactly (sum $1,500). |
| **$1,000 and $500 allocations** | **Mine** | Invented planning splits that follow your brief's guidance (single-room, essential equipment). Review and change them. |
| Reference unit CADR 350 m³/h at $260, filter set $75; smaller unit 250 m³/h at $200 | **Mine** | Planning figures chosen to be consistent with your $520 line for two units. Not supplier quotations and not tied to a product. |
| School hours Mon–Fri 07:00–15:00 | **My assumption** | Change `isSchoolHour` in `app/src/lib/data.ts` if your school's day differs. |
| "Proposed targets" (≥ 10 school days, ≥ 90% complete, toolkit read by ≥ 3 outside educators) | **Mine** | Labeled as proposed targets, not results. |

The synthetic dataset is generated from the same mass-balance model as the Air Lab plus noise, so it is **not independent evidence** that the model is right. It exists to exercise the dashboards. One outdoor dust episode is deliberately placed after the intervention day so the confounding warning has something to show.

## 4. Scientific design decisions

- **PM2.5 is the principal metric.** CO2 is displayed separately and labeled as a ventilation indicator.
- **No precise predictions.** The Studio shows a range rounded to 5% from stated assumption ranges, and says it can fall outside.
- **Observed vs estimated vs hypothetical** are separated in the UI and deck.
- **Before/after:** same school hours, intervention day excluded, outdoor ratio, comparison-room check, bootstrap interval from daily means. The interval covers day-to-day variability only, and the UI says so.
- **Not claimed:** health outcomes, medical risk, sensor accuracy, deployments, partnerships, approvals.

## 5. Resources you listed and what happened to them

- **Spline community scenes (items 2–4), Spline library and React integration (5–6):** *not used.* I did not open those pages or test their license, export or embed options, and I did not invent any scene URL. An original React Three Fiber classroom and a Canvas particle field replace them.
- **Monitair, AERIS, Air Monitoring Dashboard, Energy Nexus (7–10), React Bits, Aceternity UI, Magic UI (11–13):** *not fetched and no code copied.* The design follows your brief's direction; spotlight, grid and glass effects were written from scratch in CSS/Canvas. This is less "researched" than your prompt asked. If you want specific references reflected, name them and I will review them.
- **Official references (WHO, CDC, EPA):** fetched and read (see §3).

## 6. Known limitations

- **Browsers:** tested only in Microsoft Edge (Chromium) on Windows, using viewport emulation for mobile. Not tested in Safari, Firefox, or on real phones.
- **Accessibility:** semantic structure, labels, focus styles, a skip link, keyboard-operable room tiles and zone buttons, non-color status symbols, and a table alternative for the main chart are implemented. No screen-reader pass and no formal WCAG audit were done, so no conformance is claimed.
- **Performance:** not profiled (no Lighthouse run). The 3D library is a separate 1.15 MB (314 kB gzip) chunk loaded only when the Air Lab is near the viewport; the initial script is about 128 kB (41 kB gzip) plus a 403 kB (118 kB gzip) charts chunk. Heavy GPUs are not required, but a very old phone may be slow.
- **Air Lab zone differences** are illustrative weights, not simulation. The particle motion is a random walk with attraction to the cleaner, not CFD, and says so on screen.
- **drei quirk:** the first 3D label in a scene failed to render, so a hidden sacrificial label is mounted first (commented in `AirLabScene.tsx`).
- **Lint:** advisory React warnings (state set in effects, Fast Refresh export rules). No errors.
- **Console:** three.js logs a harmless deprecation warning about `THREE.Clock`.
- **Leftover template files:** `app/src/App.css`, `app/src/assets/*` and `app/public/icons.svg` come from the Vite template and are unused. My attempt to delete them was blocked by a safety check, so they are still there. Delete them by hand if you like.
- **Browser storage:** only the checklist ticks use `localStorage`, wrapped in try/catch.
- **Deck fonts:** PowerPoint can only show Space Grotesk, Inter and IBM Plex Mono if they are installed. The PDF has them embedded. Installing the fonts from `deck/fonts` fixes the PPTX on other machines. Without them PowerPoint substitutes a default font and some text may wrap differently.
- **Deck screenshots** are 3200×1800 PNGs, so the PPTX is ~10 MB.
- **Demo link:** slide 6 has a "[URL to be added after publishing]" placeholder because nothing was published.
- **Deadline mismatch to check:** the YPL PDF says "solo or group" and "up to $1,500"; your prompt says solo and $1,500 first place. The deck follows your prompt and the PDF's 5–10 slide, four-component format.

## 7. Changes made to your machine

To render and export the deck I installed six TrueType font files for the current Windows user only (Space Grotesk Regular/Bold, Inter Regular/Bold, IBM Plex Mono Regular/Medium; SIL Open Font License) into `%LOCALAPPDATA%\Microsoft\Windows\Fonts` with matching `HKCU` registry entries. To remove them: Settings → Personalization → Fonts → uninstall those families. Playwright and PowerPoint were used for testing and export; no other system settings were changed.

## 8. Before you submit (suggested checklist)

1. Check the WHO PM2.5 guideline and interim-target values against the WHO table.
2. Review the $1,000 and $500 budget splits and the reference-unit prices; get at least one real supplier quotation if you can.
3. Confirm school hours and ask your teacher or school leadership about the pilot, so the "subject to school approval" wording can be updated if approval arrives.
4. Decide whether to publish the prototype (GitHub + Vercel steps are in `README.md`), then add the URL to slide 6.
5. Open the PPTX with the fonts installed and flick through every slide; read the speaker notes once aloud for timing.
6. Trim the problem statement to 200 words if the form is strict (see `docs/SUBMISSION_TEXT.md`).
