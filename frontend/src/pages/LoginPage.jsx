import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  AlertCircle,
  Loader2,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'
import { useAuth } from '../context/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setErrorMessage('Username atau email wajib diisi.')
      return
    }

    if (!password) {
      setErrorMessage('Kata sandi wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      await login(trimmedUsername, password)
      // Auto-redirect ke Dashboard setelah login berhasil
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      if (err.response?.status === 401) {
        setErrorMessage('Username atau kata sandi tidak valid. Silakan periksa kembali.')
      } else if (err.response?.data?.detail) {
        setErrorMessage(
          typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : 'Format kredensial tidak sesuai.'
        )
      } else if (err.message === 'Network Error') {
        setErrorMessage('Tidak dapat terhubung ke server backend (Network Error). Pastikan server FastAPI aktif.')
      } else {
        setErrorMessage('Terjadi kendala saat proses autentikasi. Silakan coba lagi beberapa saat lagi.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Senang melihat Anda kembali."
      description="Masuk ke akun untuk melanjutkan pengelolaan dan memantau perkembangan ternak."
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="username">
            Username atau Email
          </label>

          <div className={styles.inputWrap}>
            <UserRound className={styles.inputIcon} size={17} strokeWidth={1.8} />

            <input
              className={styles.input}
              id="username"
              name="username"
              type="text"
              placeholder="Masukkan username atau email"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setErrorMessage('')
              }}
              autoComplete="username"
              disabled={isSubmitting}
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
                setErrorMessage('')
              }}
              autoComplete="current-password"
              disabled={isSubmitting}
              required
            />

            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
              }
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className={styles.feedbackError} role="alert">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke akun</span>
              <ArrowRight size={17} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      <p className={styles.switchPage}>
        Belum memiliki akun? <Link to="/register">Daftar sekarang</Link>
      </p>
    </AuthLayout>
  )
}
