export interface GlobePoint {
  id: string
  label: string
  kind: 'pilot' | 'hypothetical'
  lon: number
  lat: number
  note: string
}

export const GLOBE_POINTS: GlobePoint[] = [
  { id: 'pilot', label: 'Al Dhafra, UAE', kind: 'pilot', lon: 53.7, lat: 23.65, note: 'Proposed pilot, subject to school approval. No measurements collected yet.' },
  { id: 'sa', label: 'South Asia', kind: 'hypothetical', lon: 78, lat: 22, note: 'Potential future adaptation region. Hypothetical: no partners or plans exist.' },
  { id: 'ea', label: 'East Africa', kind: 'hypothetical', lon: 37, lat: 1, note: 'Potential future adaptation region. Hypothetical: no partners or plans exist.' },
  { id: 'sea', label: 'Southeast Asia', kind: 'hypothetical', lon: 104, lat: 12, note: 'Potential future adaptation region. Hypothetical: no partners or plans exist.' },
  { id: 'la', label: 'Andean South America', kind: 'hypothetical', lon: -72, lat: -12, note: 'Potential future adaptation region. Hypothetical: no partners or plans exist.' },
]
