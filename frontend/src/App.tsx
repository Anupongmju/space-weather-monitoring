import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Dashboard from './pages/Dashboard'
import CurrentConditions from './pages/CurrentConditions'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'

// ACE pages
import AceIndex from './pages/ace/AceIndex'
import Swepam from './pages/ace/Swepam'
import Mag from './pages/ace/Mag'
import Epam from './pages/ace/Epam'
import Sis from './pages/ace/Sis'

// GOES pages
import GoesIndex from './pages/goes/GoesIndex'
import XrayFlux from './pages/goes/XrayFlux'
import ProtonFlux from './pages/goes/ProtonFlux'
import ElectronFlux from './pages/goes/ElectronFlux'
import MagneticField from './pages/goes/MagneticField'
import SolarWind from './pages/goes/SolarWind'
import GoesSuvi from './pages/goes/GoesSuvi'

// Cosmic Ray pages
import CosmicIndex from './pages/cosmic/CosmicIndex'
import NeutronMonitor from './pages/cosmic/NeutronMonitor'
import MawIndex from './pages/cosmic/MawIndex'
import MawCounts from './pages/cosmic/MawCounts'
import MawPressure from './pages/cosmic/MawPressure'
import MawTubes from './pages/cosmic/MawTubes'
import MawScatter from './pages/cosmic/MawScatter'

import SpaceWeatherOverview from './pages/analysis/SpaceWeatherOverview'
import NoaaReport from './pages/reports/NoaaReport'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import NewsAdmin from './pages/NewsAdmin'
import About from './pages/About'
import Help from './pages/Help'

import './App.css'
import OrbitBackground from './components/space/OrbitBackground'

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden' }}>
      <ScrollToTop />
      {/* Universal Real-Time Astronomical Orbit Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <OrbitBackground />
      </div>

      {/* Gentle dark gradient overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1,
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.55) 40%, rgba(0, 0, 0, 0.75) 100%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: '100vh', position: 'relative', zIndex: 10
      }}>
        <Navbar />
        <div style={{
          flex: 1, padding: 0,
          marginTop: '60px',
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conditions" element={<CurrentConditions />} />

            {/* ACE */}
            <Route path="/ace" element={<AceIndex />} />
            <Route path="/ace/swepam" element={<Swepam />} />
            <Route path="/ace/mag" element={<Mag />} />
            <Route path="/ace/epam" element={<Epam />} />
            <Route path="/ace/sis" element={<Sis />} />


            {/* GOES */}
            <Route path="/goes" element={<GoesIndex />} />
            <Route path="/goes/xray" element={<XrayFlux />} />
            <Route path="/goes/proton" element={<ProtonFlux />} />
            <Route path="/goes/electron" element={<ElectronFlux />} />
            <Route path="/goes/mag" element={<MagneticField />} />
            <Route path="/goes/wind" element={<SolarWind />} />
            <Route path="/goes/suvi" element={<GoesSuvi />} />

            {/* Cosmic Ray */}
            <Route path="/cosmic" element={<CosmicIndex />} />
            <Route path="/cosmic/neutron" element={<NeutronMonitor />} />
            <Route path="/cosmic/maw" element={<MawIndex />} />
            <Route path='/cosmic/maw/counts' element={<MawCounts />} />
            <Route path='cosmic/maw/pressure' element={<MawPressure />} />
            <Route path='/cosmic/maw/tubes' element={<MawTubes />} />
            <Route path='/cosmic/maw/scatter' element={<MawScatter />} />
            <Route path="/analysis" element={<SpaceWeatherOverview />} />
            <Route path="/report" element={<NoaaReport />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/news/admin" element={<NewsAdmin />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            {/* Wildcard fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </div>
  )
}
