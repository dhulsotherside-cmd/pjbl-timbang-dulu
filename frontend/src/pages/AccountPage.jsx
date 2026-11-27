import { useState, useEffect } from 'react'
import {
  UserRound, Building2, Phone, MapPin, CalendarDays, AtSign, Pencil, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/useAuth' 
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import LogoutConfirmModal from '../components/layout/LogoutConfirmModal'
import styles from './AccountPage.module.css'

export default function AccountPage() {
  const { user, updateUser, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(() => user || {})
  const [isEditing, setIsEditing] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user) {
      setProfile(user)
    }
  }, [user])

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setProfile((current) => ({
      ...current,
      [name]: value,
    }))
    setErrorMessage('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await api.put('/auth/me', {
        nama_user: profile.nama_user,
        nama_peternakan: profile.nama_peternakan,
        alamat: profile.alamat,
        no_telp: profile.no_telp,
      })

      updateUser(response.data)
      setProfile(response.data)
      setIsEditing(false)
      setSuccessMessage('Profil berhasil diperbarui.')
      setTimeout(() => setSuccessMessage(''), 3500)
    } catch (err) {
      console.error('Gagal memperbarui profil:', err)
      const detail = err.response?.data?.detail
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : 'Gagal memperbarui data profil akun. Periksa isian form lalu coba lagi.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setErrorMessage('')
    if (user) {
      setProfile(user)
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'

    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return <div className={styles.page}>Memuat informasi akun...</div>
  }

  const fields = [
    {
      label: 'Nama Pengelola',
      name: 'nama_user',
      icon: UserRound,
    },
    {
      label: 'Username',
      name: 'username',
      icon: AtSign,
      readOnly: true,
    },
    {
      label: 'Nama Peternakan',
      name: 'nama_peternakan',
      icon: Building2,
    },
    {
      label: 'Alamat',
      name: 'alamat',
      icon: MapPin,
    },
    {
      label: 'Nomor Telepon',
      name: 'no_telp',
      icon: Phone,
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PENGATURAN</span>
          <h1>Akun</h1>
          <p>Kelola informasi akun dan peternakan Anda.</p>
        </div>

        {!isEditing && (
          <button
            type="button"
            className={styles.editButton}
            onClick={() => {
              setIsEditing(true)
              setErrorMessage('')
              setSuccessMessage('')
            }}
          >
            <Pencil size={16} />
            Edit Profil
          </button>
        )}
      </div>

      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: '#edf7ee',
          border: '1px solid #c2dec0',
          color: '#1f592d',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: '#fdf2f2',
          border: '1px solid #fecaca',
          color: '#c93b2b',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {errorMessage}
        </div>
      )}

      <section className={styles.profileSection}>
        <div className={styles.profileIdentity}>
          <div className={styles.avatar}>
            <UserRound size={30} />
          </div>

          <div>
            <span className={styles.profileLabel}>PENGELOLA PETERNAKAN</span>
            <h2>{profile.nama_user || 'Pengelola'}</h2>
            <p>@{profile.username || 'peternak'}</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave}>
        <section className={styles.accountSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Informasi Profil</h2>
              <p>Informasi pengelola akun.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            {fields.slice(0, 2).map((field) => {
              const Icon = field.icon

              return (
                <label className={styles.field} key={field.name}>
                  <span className={styles.fieldLabel}>
                    <Icon size={16} />
                    {field.label}
                  </span>

                  <input
                    name={field.name}
                    value={profile[field.name] || ''}
                    onChange={handleChange}
                    readOnly={!isEditing || field.readOnly}
                  />
                </label>
              )
            })}
          </div>
        </section>

        <section className={styles.accountSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Informasi Peternakan</h2>
              <p>Detail peternakan yang dikelola.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            {fields.slice(2).map((field) => {
              const Icon = field.icon

              return (
                <label className={styles.field} key={field.name}>
                  <span className={styles.fieldLabel}>
                    <Icon size={16} />
                    {field.label}
                  </span>

                  <input
                    name={field.name}
                    value={profile[field.name] || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </label>
              )
            })}
          </div>
        </section>

        {isEditing && (
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Batal
            </button>

            <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </form>

      <section className={styles.securitySection}>
        <div>
          <h2>Informasi Akun</h2>
          <p>
            <CalendarDays size={16} />
            Terdaftar sejak {formatDate(profile.created_at)}
          </p>
        </div>
      </section>

      <section className={styles.logoutSection}>
        <div>
          <h2>Keluar dari Akun</h2>
          <p>Akhiri sesi penggunaan TimbangDulu.</p>
        </div>

        <button type="button" onClick={() => setShowLogoutModal(true)}>
          <LogOut size={17} />
          Keluar Akun
        </button>
      </section>

      {/* Modal Dialog Konfirmasi Logout Full-Screen via createPortal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  )
}
