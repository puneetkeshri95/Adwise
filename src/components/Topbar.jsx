// Topbar — page title, global date picker, account label, status indicators.
import { useLocation } from 'react-router-dom'
import GlobalDatePicker from './GlobalDatePicker'
import StatusBar from './StatusBar'

const PAGE_TITLES = {
  '/app/dashboard': 'Dashboard',
  '/app/reporting': 'Reporting',
  '/app/behaviour': 'Behaviour',
  '/app/journeys': 'User Journeys',
  '/app/integration': 'Integration',
  '/app/chat': 'AI Assistant',
  '/app/settings': 'Settings',
  '/app/metrics': 'Metrics Library',
}

export default function Topbar({ accountName, accountId }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'AdWise'

  return (
    <header className="sticky top-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-600/30">
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <StatusBar />
        </div>

        <div className="flex items-center gap-3">
          {accountName && (
            <div className="hidden md:flex flex-col items-end leading-tight">
              <div className="text-xs text-white font-medium">{accountName}</div>
              <div className="text-[10px] text-gray-500 font-mono">{accountId}</div>
            </div>
          )}
          <GlobalDatePicker />
        </div>
      </div>
    </header>
  )
}
