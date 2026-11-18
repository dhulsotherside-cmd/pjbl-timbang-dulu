
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  UserRound,
  Mail,
  LockKeyhole,
  House,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'

const initialForm = {
  nama_user: '',
  nama_peternakan: '',
  email: '',
  password: '',
  konfirmasiPassword: '',
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [notice, setNotice] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setNotice('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (form.password.length < 6) {
      setNotice('Password minimal harus terdiri dari 6 karakter.')
      return
    }

    if (form.password !== form.konfirmasiPassword) {
      setNotice('Konfirmasi password belum cocok. Periksa kembali.')
      return
    }

    setNotice(
      'Form registrasi sudah siap. Proses pendaftaran akan diaktifkan setelah API backend tersedia.'
    )
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
                required
              />
            </div>
          </div>
        </div>

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
              value={form.email}
              onChange={handleChange}
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
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
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

        {notice && (
          <div className={styles.feedback} role="status">
            {notice}
          </div>
        )}

        <button type="submit" className={styles.submitButton}>
          <span>Buat akun peternakan</span>
          <ArrowRight size={17} strokeWidth={2} />
        </button>
      </form>

      <p className={styles.switchPage}>
        Sudah memiliki akun? <Link to="/login">Masuk di sini</Link>
      </p>
    </AuthLayout>
  )
}
