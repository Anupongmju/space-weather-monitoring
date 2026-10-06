import { useSearchParams } from 'react-router-dom'
import StandardOverview from './StandardOverview'
import CosmicHelioOverview from './CosmicHelioOverview'

export default function SpaceWeatherOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') === 'cosmic' ? 'cosmic' : 'standard'

  const handleViewChange = (view: 'standard' | 'cosmic') => {
    setSearchParams(view === 'standard' ? {} : { view: 'cosmic' })
  }

  if (activeView === 'cosmic') {
    return <CosmicHelioOverview activeView="cosmic" onViewChange={handleViewChange} />
  }

  return <StandardOverview activeView="standard" onViewChange={handleViewChange} />
}
