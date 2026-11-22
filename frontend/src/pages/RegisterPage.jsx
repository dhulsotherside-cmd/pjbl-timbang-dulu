import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  UserRound,
  AtSign,
  LockKeyhole,
  House,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'
import api from '../services/api'

const initialForm = {
  nama_user: '',
  nama_peternakan: '',
  username: '',
  password: '',
  konfirmasiPassword: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setNotice('')
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setNotice('')
    setErrorMessage('')

    const trimmedName = form.nama_user.trim()
    const trimmedFarm = form.nama_peternakan.trim()
    const trimmedUsername = form.username.trim()

    if (!trimmedName) {
      setErrorMessage('Nama admin wajib diisi.')
      return
    }

    if (!trimmedFarm) {
      setErrorMessage('Nama peternakan wajib diisi.')
      return
    }

    if (!trimmedUsername) {
      setErrorMessage('Username akun wajib diisi.')
      return
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username minimal harus terdiri dari 3 karakter.')
      return
    }

    if (form.password.length < 6) {
      setErrorMessage('Password minimal harus terdiri dari 6 karakter.')
      return
    }

    if (form.password !== form.konfirmasiPassword) {
      setErrorMessage('Konfirmasi password belum cocok. Periksa kembali.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        username: trimmedUsername,
        password: form.password,
        nama_user: trimmedName,
        nama_peternakan: trimmedFarm,
      }

      await api.post('/auth/register', payload)

      setNotice('Pendaftaran berhasil! Mengalihkan ke halaman login...')
      setTimeout(() => {
        navigate('/login', {
          state: {
            registeredUsername: trimmedUsername,
            message: 'Akun berhasil dibuat. Silakan masuk menggunakan akun baru Anda.',
          },
        })
      }, 1200)
    } catch (err) {
      console.error('Registration error:', err)
      if (err.response?.status === 400 || err.response?.status === 409) {
        setErrorMessage(
          err.response?.data?.detail || 'Username sudah digunakan. Silakan gunakan username lain.'
        )
      } else if (err.response?.data?.detail) {
        setErrorMessage(
          typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : 'Data pendaftaran tidak valid.'
        )
      } else if (err.message === 'Network Error') {
        setErrorMessage('Tidak dapat terhubung ke server backend (Network Error). Pastikan server FastAPI aktif.')
      } else {
        setErrorMessage('Terjadi kendala saat proses pendaftaran. Silakan coba lagi beberapa saat lagi.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Mulai kelola peternakan Anda."
      description="Buat akun untuk menyimpan data sapi, mencatat pengukuran, dan mengikuti perkembangannya."
      size="wide"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="nama_user">
              Nama Admin
            </label>

            <div className={styles.inputWrap}>
              <UserRound
                className={styles.inputIcon}
                size={17}
                strokeWidth={1.8}
              />

              <input
                className={styles.input}
                id="nama_user"
                name="nama_user"
                type="text"
                placeholder="Nama lengkap"
                value={form.nama_user}
                onChange={handleChange}
                autoComplete="name"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="nama_peternakan">
              Nama peternakan
            </label>

            <div className={styles.inputWrap}>
              <Building2
                className={styles.inputIcon}
                size={17}
                strokeWidth={1.8}
              />

              <input
                className={styles.input}
                id="nama_peternakan"
                name="nama_peternakan"
                type="text"
                placeholder="Contoh: Makmur Farm"
                value={form.nama_peternakan}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="username">
            Username
          </label>

          <div className={styles.inputWrap}>
            <AtSign className={styles.inputIcon} size={17} strokeWidth={1.8} />

            <input
              className={styles.input}
              id="username"
              name="username"
              type="text"
              placeholder="Contoh: peternak_makmur"
              value={form.username}
              onChange={handleChange}
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
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
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
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
            </button>
          </div>

          <span className={styles.fieldHint}>
            Gunakan minimal 6 karakter untuk password akun.
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="konfirmasiPassword">
            Konfirmasi password
          </label>

          <div className={styles.inputWrap}>
            <LockKeyhole
              className={styles.inputIcon}
              size={17}
              strokeWidth={1.8}
            />

            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="konfirmasiPassword"
              name="konfirmasiPassword"
              type={showConfirmation ? 'text' : 'password'}
              placeholder="Masukkan ulang password"
              value={form.konfirmasiPassword}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={isSubmitting}
              required
            />

            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmation((current) => !current)}
              aria-label={
                showConfirmation
                  ? 'Sembunyikan konfirmasi password'
                  : 'Tampilkan konfirmasi password'
              }
            >
              {showConfirmation ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        <div className={styles.formNote}>
          <House size={16} strokeWidth={1.8} />
          <span>
            Satu akun digunakan untuk mengelola satu peternakan.
          </span>
        </div>

        {errorMessage && (
          <div className={styles.feedbackError} role="alert">
            {errorMessage}
          </div>
        )}

        {notice && (
          <div className={styles.feedback} role="status">
            {notice}
          </div>
        )}

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          <span>{isSubmitting ? 'Mendaftarkan...' : 'Buat akun peternakan'}</span>
          <ArrowRight size={17} strokeWidth={2} />
        </button>
      </form>

      <p className={styles.switchPage}>
        Sudah memiliki akun? <Link to="/login">Masuk di sini</Link>
      </p>
    </AuthLayout>
  )
}
