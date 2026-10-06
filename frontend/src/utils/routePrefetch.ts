// routePrefetch.ts
// Preloads chunks for lazy-loaded pages on idle or hover for instant transitions

const routeLoaders: Record<string, () => Promise<any>> = {
  '/': () => import('../pages/Dashboard'),
  '/conditions': () => import('../pages/CurrentConditions'),
  '/radiation': () => import('../pages/RadiationMonitoring'),
  '/moon': () => import('../pages/moon/MoonDashboard'),
  '/mars': () => import('../pages/mars/MarsDashboard'),
  '/analysis': () => import('../pages/analysis/SpaceWeatherOverview'),
  '/news': () => import('../pages/News'),
  '/report': () => import('../pages/reports/NoaaReport'),
  '/about': () => import('../pages/About'),
  '/help': () => import('../pages/Help'),
  '/solar/sunspot': () => import('../pages/solar/SunspotNumber'),
  '/cosmic': () => import('../pages/cosmic/CosmicIndex'),
  '/cosmic/neutron': () => import('../pages/cosmic/NeutronMonitor'),
  '/cosmic/map': () => import('../pages/cosmic/NeutronMapPage'),
  '/cosmic/maw': () => import('../pages/cosmic/MawIndex'),
  '/cosmic/psnm': () => import('../pages/cosmic/PsnmIndex'),
  '/ace': () => import('../pages/ace/AceIndex'),
  '/ace/swepam': () => import('../pages/ace/Swepam'),
  '/ace/mag': () => import('../pages/ace/Mag'),
  '/ace/epam': () => import('../pages/ace/Epam'),
  '/ace/sis': () => import('../pages/ace/Sis'),
  '/goes': () => import('../pages/goes/GoesIndex'),
  '/goes/xray': () => import('../pages/goes/XrayFlux'),
  '/goes/proton': () => import('../pages/goes/ProtonFlux'),
  '/goes/electron': () => import('../pages/goes/ElectronFlux'),
  '/goes/mag': () => import('../pages/goes/MagneticField'),
  '/goes/wind': () => import('../pages/goes/SolarWind'),
  '/goes/suvi': () => import('../pages/goes/GoesSuvi'),
  '/custom-studio': () => import('../pages/studio/CustomStudio'),
}

const prefetched = new Set<string>()

export function prefetchRoute(path: string) {
  if (!path) return
  const cleanPath = path.split('?')[0].split('#')[0]
  if (prefetched.has(cleanPath)) return
  const loader = routeLoaders[cleanPath]
  if (loader) {
    prefetched.add(cleanPath)
    loader().catch(() => {
      prefetched.delete(cleanPath)
    })
  }
}

// Prefetch high-traffic pages in background after idle
export function prefetchCoreRoutes() {
  if (typeof window === 'undefined') return
  const corePaths = ['/radiation', '/conditions', '/moon', '/mars', '/analysis', '/cosmic/psnm', '/cosmic/maw']
  
  const runPrefetch = () => {
    corePaths.forEach((path, idx) => {
      setTimeout(() => prefetchRoute(path), idx * 250)
    })
  }

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPrefetch)
  } else {
    setTimeout(runPrefetch, 1000)
  }
}
