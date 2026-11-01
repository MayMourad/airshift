# AIRSHIFT prototype (app)

React 19 + TypeScript + Vite + Tailwind CSS 4 + React Three Fiber + Recharts. No API keys or paid services.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
npm run preview   # http://localhost:4173
npm run test:e2e  # browser checks against the preview server (needs Microsoft Edge)
npm run capture   # regenerate screenshots into ../screens
```

Source map:

- `src/lib/model.ts` — physical model, EPA CADR sizing, budgets, option scoring, every documented assumption
- `src/lib/data.ts` — synthetic dataset generator (seeded), statistics, bootstrap interval, data-quality warnings
- `src/lib/csv.ts` — CSV parse and validation, templates, downloads
- `src/lib/report.ts` — exportable sample report
- `src/components/` — Hero, AirLab (+ AirLabScene), SchoolMap, Studio, Evidence, Replication (+ Globe), Sources

See the top-level `README.md` for the project overview and `docs/VERIFICATION_REPORT.md` for limitations. All demo data is synthetic.
