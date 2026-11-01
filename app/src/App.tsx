import { AppProvider } from './state'
import Nav from './components/Nav'
import Hero from './components/Hero'
import AirLab from './components/AirLab'
import SchoolMap from './components/SchoolMap'
import Studio from './components/Studio'
import Evidence from './components/Evidence'
import Replication from './components/Replication'
import Sources from './components/Sources'

export default function App() {
  return (
    <AppProvider>
      <a href="#air-lab" className="skip-link">Skip to the Air Lab</a>
      <Nav />
      <Hero />
      <main id="main">
        <AirLab />
        <SchoolMap />
        <Studio />
        <Evidence />
        <Replication />
        <Sources />
      </main>
    </AppProvider>
  )
}
