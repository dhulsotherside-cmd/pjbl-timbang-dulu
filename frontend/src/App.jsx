
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './components/auth/ProtectedRoute'
import GuestRoute from './components/auth/GuestRoute'

import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import CattlePage from './pages/CattlePage'
import CattleDetailPage from './pages/CattleDetailPage'
import MeasurementPage from './pages/MeasurementPage'
import AccountPage from './pages/AccountPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<LandingPage />} />

        {/* Guest Routes (Hanya untuk pengguna yang belum login) */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected Routes (Wajib memiliki token autentikasi valid) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="sapi" element={<CattlePage />} />
            <Route path="sapi/:id" element={<CattleDetailPage />} />
            <Route path="ukur" element={<MeasurementPage />} />
            <Route path="akun" element={<AccountPage />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
