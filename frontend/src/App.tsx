import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Dashboard from './pages/Dashboard'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { prefetchCoreRoutes } from './utils/routePrefetch'

// Lazy-loaded pages
const CurrentConditions = lazy(() => import('./pages/CurrentConditions'))

// ACE pages
const AceIndex = lazy(() => import('./pages/ace/AceIndex'))
const Swepam = lazy(() => import('./pages/ace/Swepam'))
const Mag = lazy(() => import('./pages/ace/Mag'))
const Epam = lazy(() => import('./pages/ace/Epam'))
const Sis = lazy(() => import('./pages/ace/Sis'))

// GOES pages
const GoesIndex = lazy(() => import('./pages/goes/GoesIndex'))
const XrayFlux = lazy(() => import('./pages/goes/XrayFlux'))
const ProtonFlux = lazy(() => import('./pages/goes/ProtonFlux'))
const ElectronFlux = lazy(() => import('./pages/goes/ElectronFlux'))
const MagneticField = lazy(() => import('./pages/goes/MagneticField'))
const SolarWind = lazy(() => import('./pages/goes/SolarWind'))
const GoesSuvi = lazy(() => import('./pages/goes/GoesSuvi'))

// Cosmic Ray pages
const CosmicIndex = lazy(() => import('./pages/cosmic/CosmicIndex'))
const NeutronMonitor = lazy(() => import('./pages/cosmic/NeutronMonitor'))
const NeutronMapPage = lazy(() => import('./pages/cosmic/NeutronMapPage'))
const MawIndex = lazy(() => import('./pages/cosmic/MawIndex'))
const PsnmIndex = lazy(() => import('./pages/cosmic/PsnmIndex'))
const SunspotNumber = lazy(() => import('./pages/solar/SunspotNumber'))

const SpaceWeatherOverview = lazy(() => import('./pages/analysis/SpaceWeatherOverview'))
const RadiationMonitoring = lazy(() => import('./pages/RadiationMonitoring'))
const MarsDashboard = lazy(() => import('./pages/mars/MarsDashboard'))
const MoonDashboard = lazy(() => import('./pages/moon/MoonDashboard'))
const NoaaReport = lazy(() => import('./pages/reports/NoaaReport'))
const News = lazy(() => import('./pages/News'))
const NewsDetail = lazy(() => import('./pages/NewsDetail'))
const NewsAdmin = lazy(() => import('./pages/NewsAdmin'))
const About = lazy(() => import('./pages/About'))
const Help = lazy(() => import('./pages/Help'))
const CustomStudio = lazy(() => import('./pages/studio/CustomStudio'))

import './App.css'
import OrbitBackground from './components/space/OrbitBackground'
import StudioFloatingButton from './components/studio/StudioFloatingButton'
import { useTheme } from './context/ThemeContext'

export default function App() {
  const location = useLocation()
  const { theme } = useTheme()
  const isDashboard = location.pathname === '/'

  useEffect(() => {
    prefetchCoreRoutes()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base, #020617)', position: 'relative', overflowX: 'hidden', transition: 'background-color 0.3s ease' }}>
      <ScrollToTop />
      {/* Astronomical Orbit Background & Overlay — active exclusively on Dashboard Home */}
      {isDashboard && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <OrbitBackground />
          </div>
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.75) 100%)',
            pointerEvents: 'none',
          }} />
        </>
      )}

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: '100vh', position: 'relative', zIndex: 10
      }}>
        <Navbar />
        <div style={{
          flex: 1, padding: 0,
          marginTop: '60px',
        }}>
          <Suspense fallback={<LoadingSpinner text="Loading Module..." />}>
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

              {/* Cosmic Ray & Solar */}
              <Route path="/solar/sunspot" element={<SunspotNumber />} />
              <Route path="/cosmic" element={<CosmicIndex />} />
              <Route path="/cosmic/neutron" element={<NeutronMonitor />} />
              <Route path="/cosmic/map" element={<NeutronMapPage />} />
              <Route path="/cosmic/globe" element={<NeutronMapPage />} />
              <Route path="/cosmic/maw" element={<MawIndex />} />
              <Route path="/cosmic/maw/counts" element={<Navigate to="/cosmic/maw?view=counts" replace />} />
              <Route path="/cosmic/maw/pressure" element={<Navigate to="/cosmic/maw?view=pressure" replace />} />
              <Route path="/cosmic/maw/tubes" element={<Navigate to="/cosmic/maw?view=tubes" replace />} />
              <Route path="/cosmic/maw/scatter" element={<Navigate to="/cosmic/maw?view=scatter" replace />} />
              <Route path="/cosmic/psnm" element={<PsnmIndex />} />
              <Route path="/radiation" element={<RadiationMonitoring />} />
              <Route path="/mars" element={<MarsDashboard />} />
              <Route path="/mars/rad" element={<MarsDashboard />} />
              <Route path="/moon" element={<MoonDashboard />} />
              <Route path="/lunar" element={<MoonDashboard />} />
              <Route path="/analysis" element={<SpaceWeatherOverview />} />
              <Route path="/analysis/cosmic" element={<Navigate to="/analysis?view=cosmic" replace />} />
              <Route path="/report" element={<NoaaReport />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/news/admin" element={<NewsAdmin />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<Help />} />
              <Route path="/custom-studio" element={<CustomStudio />} />
              <Route path="/studio" element={<Navigate to="/custom-studio" replace />} />
              <Route path="/analysis/custom-studio" element={<Navigate to="/custom-studio" replace />} />
              {/* Wildcard fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
        <StudioFloatingButton />
        <Footer />
      </div>
    </div>
  )
}
