import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AllRecordsPage } from './pages/AllRecordsPage'
import { HomePage } from './pages/HomePage'
import { LocationLogPage } from './pages/LocationLogPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/records" element={<AllRecordsPage />} />
          <Route path="/location/:locationId" element={<LocationLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
