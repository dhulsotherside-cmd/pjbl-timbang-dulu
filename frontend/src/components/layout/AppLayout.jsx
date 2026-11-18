import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Beef,
  ScanLine,
  UserRound,
} from 'lucide-react'
import styles from './AppLayout.module.css'
import logo from '../../assets/images/logo-timbangdulu.png'
import { useState, useEffect } from 'react'
import { loadAccountProfile } from '../../mocks/accountData'

const navigation = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
  { label: 'Data Sapi', path: '/app/sapi', icon: Beef },
  { label: 'Pengukuran', path: '/app/ukur', icon: ScanLine },
  { label: 'Akun', path: '/app/akun', icon: UserRound },
]

function AppLayout() {
  const location = useLocation()
const [profile, setProfile] = useState(() => loadAccountProfile())

useEffect(() => {
  const syncProfile = () => {
    setProfile(loadAccountProfile())
  }

  window.addEventListener('storage', syncProfile)
  window.addEventListener('timbangdulu-profile-updated', syncProfile)

  return () => {
    window.removeEventListener('storage', syncProfile)
    window.removeEventListener('timbangdulu-profile-updated', syncProfile)
  }
}, [])
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
            <div className={styles.farmAvatar}>TD</div>
            <div>
              <strong>{profile.nama_peternakan}</strong>
<span>{profile.nama_user}</span>
            </div>
          </div>
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
    </div>
  )
}

export default AppLayout
