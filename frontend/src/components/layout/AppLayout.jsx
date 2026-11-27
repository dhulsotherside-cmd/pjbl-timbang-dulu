import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Beef,
  ScanLine,
  UserRound,
  LogOut,
} from 'lucide-react'
import styles from './AppLayout.module.css'
import logo from '../../assets/images/logo-timbangdulu.png'
import { useState } from 'react'
import { useAuth } from '../../context/useAuth'
import LogoutConfirmModal from './LogoutConfirmModal'

const navigation = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
  { label: 'Data Sapi', path: '/app/sapi', icon: Beef },
  { label: 'Pengukuran', path: '/app/ukur', icon: ScanLine },
  { label: 'Akun', path: '/app/akun', icon: UserRound },
]

function getInitials(name) {
  if (!name) return 'TD'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    logout()
    navigate('/login', { replace: true })
  }

  const currentPage = navigation.find((item) =>
    item.end
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path)
  )

  const isDetailPage =
    /^\/app\/sapi\/[^/]+$/.test(location.pathname)

  const pageTitle = isDetailPage
    ? 'Detail Sapi'
    : currentPage?.label || 'Dashboard'

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img
            src={logo}
            alt="TimbangDulu"
            className={styles.brandLogo}
          />
          <span>TimbangDulu</span>
        </div>

        <div className={styles.farmLabel}>MENU UTAMA</div>

        <nav className={styles.navigation}>
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.farmInfo}>
            <div className={styles.farmAvatar}>
              {getInitials(user?.nama_user)}
            </div>
            <div>
              <strong>{user?.nama_peternakan || 'Peternakan'}</strong>
              <span>{user?.nama_user || 'Pengguna'}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.sidebarLogoutButton}
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={15} />
            <span>Keluar</span>
          </button>

          <p>Estimasi bobot sapi lebih praktis.</p>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarEyebrow}>TIMBANGDULU</span>
            <h1>{pageTitle}</h1>
          </div>
        </header>

        <main className={styles.pageContent}>
          <div className={styles.organicShape} />
          <Outlet />
        </main>
      </div>

      <nav className={styles.mobileNav}>
        {navigation.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileActive : ''}`
            }
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{label === 'Pengukuran' ? 'Ukur' : label}</span>
          </NavLink>
        ))}
      </nav>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  )
}

export default AppLayout
