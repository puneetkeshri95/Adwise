import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ReportingPage from './pages/ReportingPage'
import BehaviourPage from './pages/BehaviourPage'
import IntegrationPage from './pages/IntegrationPage'
import SettingsPage from './pages/SettingsPage'
import ChatPage from './pages/ChatPage'
import MetricsLibraryPage from './pages/MetricsLibraryPage'
import JourneysPage from './pages/JourneysPage'
import AppShell from './components/AppShell'
import { isAuthenticated } from './api'
import { DateRangeProvider } from './contexts/DateRangeContext'

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <DateRangeProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="behaviour" element={<BehaviourPage />} />
          <Route path="journeys" element={<JourneysPage />} />
          <Route path="integration" element={<IntegrationPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="metrics" element={<MetricsLibraryPage />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </DateRangeProvider>
  )
}


