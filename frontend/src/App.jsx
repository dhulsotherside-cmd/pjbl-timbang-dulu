
import { BrowserRouter, Routes, Route } from 'react-router-dom'

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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sapi" element={<CattlePage />} />
          <Route path="sapi/:id" element={<CattleDetailPage />} />
          <Route path="ukur" element={<MeasurementPage />} />
          <Route path="akun" element={<AccountPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
