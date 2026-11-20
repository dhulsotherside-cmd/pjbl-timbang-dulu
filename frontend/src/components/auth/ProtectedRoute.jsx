import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

/**
 * ProtectedRoute Component (Route Guard)
 * Menjaga rute internal aplikasi agar hanya dapat diakses oleh pengguna
 * yang memiliki sesi aktif dan token valid.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, token } = useAuth()
  const location = useLocation()

  // Tunggu hingga pemeriksaan awal sesi token selesai
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F2F0E6',
          color: '#203C32',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Memverifikasi sesi...
      </div>
    )
  }

  // Jika tidak ada token atau belum terautentikasi, alihkan ke /login
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children ? children : <Outlet />
}
