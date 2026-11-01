import { ExternalLink } from 'lucide-react'
import { Section } from './ui'

const SOURCES = [
  { org: 'World Health Organization', title: 'Air pollution', url: 'https://www.who.int/health-topics/air-pollution', used: 'The statistic that almost all of the global population (99%) breathe air exceeding WHO guideline limits; the ~7 million premature deaths associated with combined ambient and household air pollution. Both are global figures.' },
  { org: 'World Health Organization', title: 'WHO global air quality guidelines (2021)', url: 'https://www.who.int/publications/i/item/9789240034228', used: 'PM2.5 reference levels of 5 µg/m³ (annual) and 15 µg/m³ (24-hour), and the 24-hour interim target 3 of 37.5 µg/m³ used for display bands. Values taken from the WHO guideline tables; the publication landing page itself does not print them.' },
  { org: 'US CDC / NIOSH', title: 'Ventilation in Schools and Childcare Programs', url: 'https://www.cdc.gov/niosh/ventilation/guidelines/', used: 'HVAC maintenance and filtration guidance; portable HEPA cleaners as a supplement; “improve filtration as much as possible without significantly reducing airflow”.' },
  { org: 'US EPA', title: 'Guide to Air Cleaners in the Home', url: 'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home', used: 'CADR sizing rule of thumb (65 cfm per 100 ft² at 8-ft ceilings), avoiding ozone-emitting cleaners, filter replacement, and that air cleaners supplement source control and ventilation.' },
  { org: 'Alhebsi, Abuelgasim, Almurshidi, Al Hosani & Ramadan (2025)', title: 'Investigations on the Patterns of Air Pollution in the Emirate of Abu Dhabi, UAE', url: 'https://doi.org/10.5194/isprs-archives-XLVIII-4-W17-2025-13-2026', used: 'Context that desert dust is a major natural particulate source in Abu Dhabi emirate (outdoor, regional). ISPRS Archives XLVIII-4/W17-2025, CC BY 4.0.' },
  { org: 'IQAir', title: 'United Arab Emirates air quality', url: 'https://www.iqair.com/united-arab-emirates', used: 'Country-level annual PM2.5 for 2025: 36.4 µg/m³, 7.3× the WHO annual guideline. Outdoor and national, from a private data provider; not a school measurement.' },
]

const REFS = [
  { name: 'Spline community scenes (items 2–4)', status: 'Not embedded', why: 'Community files could not be verified for license, export format or runtime embedding from this environment, so no Spline scene is used. An original React Three Fiber classroom and Canvas particle field replace them.' },
  { name: 'Spline React integration (@splinetool/react-spline)', status: 'Not used', why: 'Would need a published scene URL that is verified. None was fabricated.' },
  { name: 'React Bits, Aceternity UI, Magic UI', status: 'Inspiration only', why: 'No component code copied. Spotlight, grid and glass ideas were re-implemented in plain CSS, Canvas and React.' },
  { name: 'Monitair, AERIS, Air Monitoring Dashboard, Energy Nexus', status: 'Inspiration only', why: 'Studied for hierarchy and restraint; nothing copied.' },
]

export default function Sources() {
  return (
    <Section id="sources" eyebrow="Evidence & honesty" title="Sources, limits and credits." lead="Every claim in the prototype traces to a source below, or is labeled as an assumption, a plan, or simulated data.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SOURCES.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="panel group block p-5 transition-colors hover:border-teal/60">
            <p className="text-xs text-slate">{s.org}</p>
            <p className="mt-1 flex items-start justify-between gap-3 font-semibold">{s.title}<ExternalLink size={15} className="mt-1 shrink-0 text-teal opacity-70 group-hover:opacity-100" aria-label="opens in a new tab" /></p>
            <p className="mt-2 text-sm leading-relaxed text-slate">{s.used}</p>
          </a>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Visual references and licensing</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {REFS.map((r) => (
              <li key={r.name}><p><strong>{r.name}</strong> <span className="chip ml-1">{r.status}</span></p><p className="mt-1 text-xs leading-relaxed text-slate">{r.why}</p></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate">Open-source libraries: React, Three.js, React Three Fiber, drei, Recharts, d3-geo, topojson-client, Lucide, Fontsource (Space Grotesk, Inter, IBM Plex Mono: SIL OFL). Land outlines: Natural Earth via world-atlas (ISC).</p>
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Limits you should know</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#cfe3ea]">
            <li>All room data in this prototype is <strong>synthetic</strong>. No sensor is connected and no real classroom was measured.</li>
            <li>The Air Lab particle animation is conceptual, not computational fluid dynamics. Concentrations come from a single-zone mass balance with stated assumptions.</li>
            <li>Costs are preliminary planning figures, not supplier quotations.</li>
            <li>Low-cost sensors have unknown absolute bias; relative comparisons on the same device are more reliable.</li>
            <li>No medical diagnosis or health-risk prediction. No student-identifiable information is collected; CSV imports with name-like columns are rejected.</li>
            <li>Not a deployed system. The pilot is proposed and subject to school approval.</li>
          </ul>
        </div>
      </div>

      <footer className="mt-16 border-t border-[var(--line)] pt-8 text-sm text-slate">
        <p className="font-display text-lg text-ice">AIRSHIFT · Making the Invisible Visible. Turning Awareness into Action.</p>
        <p className="mt-2">Created by May Ahmed Mourad, Grade 12, ADNOC Schools Madinat Zayed, Al Dhafra, UAE, for the Young Planet Leaders Changemaker Academy 2026 (<em>Vision to Action</em>). Solo participant. Interactive prototype for demonstration; not an official school or YPL product.</p>
      </footer>
    </Section>
  )
}
