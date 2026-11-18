
import { Link } from 'react-router-dom'
import styles from './AuthLayout.module.css'
import logo from '../../assets/images/logo-timbangdulu.png'

// Nanti ganti isi area brandMark dengan <img> logo asli TimbangDulu.
export default function AuthLayout({
  title,
  description,
  children,
  size = 'default',
}) {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link
          to="/"
          className={styles.brand}
          aria-label="TimbangDulu, kembali ke beranda"
        >
          <span className={styles.brandMark}>
  <img
    src={logo}
    alt=""
    className={styles.brandLogo}
  />
</span>
          <span className={styles.brandName}>TimbangDulu</span>
        </Link>
      </header>

      <div className={styles.content}>
        <section
          className={`${styles.card} ${
            size === 'wide' ? styles.cardWide : ''
          }`}
        >
          <div className={styles.heading}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className={styles.cardBody}>
            {children}
          </div>

          <Link to="/" className={styles.backLink}>
            Kembali ke beranda
          </Link>
        </section>
      </div>
    </main>
  )
}
