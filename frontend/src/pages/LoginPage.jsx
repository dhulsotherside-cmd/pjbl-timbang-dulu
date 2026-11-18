
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    setNotice(
      'Tampilan login sudah siap. Proses masuk akan diaktifkan setelah API autentikasi email tersedia.'
    )
  }

  return (
    <AuthLayout
  title="Senang melihat Anda kembali."
  description="Masuk ke akun untuk melanjutkan pengelolaan dan memantau perkembangan ternak."
>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">
            Alamat email
          </label>

          <div className={styles.inputWrap}>
            <Mail className={styles.inputIcon} size={17} strokeWidth={1.8} />

            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setNotice('')
              }}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="password">
            Password
          </label>

          <div className={styles.inputWrap}>
            <LockKeyhole
              className={styles.inputIcon}
              size={17}
              strokeWidth={1.8}
            />

            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setNotice('')
              }}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
              }
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {notice && (
          <div className={styles.feedback} role="status">
            {notice}
          </div>
        )}

        <button type="submit" className={styles.submitButton}>
          <span>Masuk ke akun</span>
          <ArrowRight size={17} strokeWidth={2} />
        </button>
      </form>

      <p className={styles.switchPage}>
        Belum memiliki akun? <Link to="/register">Daftar sekarang</Link>
      </p>
    </AuthLayout>
  )
}
