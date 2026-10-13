import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Connectors from './pages/Connectors.jsx'
import MCPIntegration from './pages/MCPIntegration.jsx'
import Presentations from './pages/Presentations.jsx'
import Settings from './pages/Settings.jsx'
import Toasts from './components/Toasts.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="connectors" element={<Connectors />} />
          <Route path="mcp" element={<MCPIntegration />} />
          <Route path="presentations" element={<Presentations />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
