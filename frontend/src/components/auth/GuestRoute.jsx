import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

/**
 * GuestRoute Component (Reverse Guard)
 * Mencegah pengguna yang sudah login untuk mengakses kembali halaman /login atau /register,
 * dan langsung mengarahkannya ke dashboard.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, token } = useAuth()

  if (isLoading) {
    return null
  }

  // Jika sudah terautentikasi atau memiliki token valid, alihkan ke dashboard /app
  if (isAuthenticated || token) {
    return <Navigate to="/app" replace />
  }

  return children ? children : <Outlet />
}
