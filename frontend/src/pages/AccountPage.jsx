import {useState } from 'react'
import {
  UserRound, Building2, Phone, MapPin, CalendarDays, AtSign, Pencil, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/useAuth' 
import { useNavigate } from 'react-router-dom'
import {
  loadAccountProfile,
  saveAccountProfile,
} from '../mocks/accountData'
import styles from './AccountPage.module.css'



export default function AccountPage() {

  const { isLoading, logout } = useAuth()
const navigate = useNavigate()
  const [profile, setProfile] = useState(() => loadAccountProfile())

  const [isEditing, setIsEditing] = useState(false)
const handleLogout = () => {
  const confirmed = window.confirm(
    'Apakah Anda yakin ingin keluar dari akun?'
  )

  if (!confirmed) return

  logout()
  navigate('/')
}
  

  const handleChange = (event) => {
    const { name, value } = event.target

    setProfile((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSave = (event) => {
  event.preventDefault()
  saveAccountProfile(profile)
  window.dispatchEvent(new Event('timbangdulu-profile-updated'))
  setIsEditing(false)

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
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
            Edit Profil
          </button>
        )}
      </div>

      <section className={styles.profileSection}>
        <div className={styles.profileIdentity}>
          <div className={styles.avatar}>
            <UserRound size={30} />
          </div>

          <div>
            <span className={styles.profileLabel}>PENGELOLA PETERNAKAN</span>
            <h2>{profile.nama_user}</h2>
            <p>@{profile.username}</p>
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
              onClick={() => {
  setIsEditing(false)
  setProfile(loadAccountProfile())
}}
            >
              Batal
            </button>

            <button type="submit" className={styles.saveButton}>
              Simpan Perubahan
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

        <button type="button" onClick={handleLogout}>
          <LogOut size={17} />
          Keluar
        </button>
      </section>
    </div>
  )
}
