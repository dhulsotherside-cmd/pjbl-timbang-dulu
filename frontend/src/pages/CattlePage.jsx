import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Beef,
  Archive,
} from 'lucide-react'
import {
  getActiveCattle,
  getArchivedCattle,
  getCattleWithLatestWeight,
    addCattle,
  generateNextCattleId,
} from '../mocks/cattleData'
import styles from './CattlePage.module.css'

function formatDate(date) {
  if (!date) return 'Belum diukur'

  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CattlePage() {
  
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('active')
  const [breedFilter, setBreedFilter] = useState('Semua')
  const [genderFilter, setGenderFilter] = useState('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [newCow, setNewCow] = useState({
  id: '',
  tag: '',
  breed: '',
  gender: '',
  ageMonths: '',
})

const [formError, setFormError] = useState('')

  const activeCattle = getActiveCattle()
const archivedCattle = getArchivedCattle()

const cattleData = getCattleWithLatestWeight().filter(
  (cow) => cow.status === activeTab
)

  const filteredCattle = useMemo(() => {
    return cattleData.filter((cow) => {
      const matchesSearch =
        cow.id.toLowerCase().includes(search.toLowerCase()) ||
        cow.tag.toLowerCase().includes(search.toLowerCase())

      const matchesBreed =
        breedFilter === 'Semua' || cow.breed === breedFilter

      const matchesGender =
        genderFilter === 'Semua' || cow.gender === genderFilter

      return matchesSearch && matchesBreed && matchesGender
    })
  }, [search, breedFilter, genderFilter, cattleData])
const openAddModal = () => {
  setNewCow({
    id: generateNextCattleId(),
    tag: '',
    breed: '',
    gender: '',
    ageMonths: '',
  })
  setFormError('')
  setShowAddModal(true)
}

const handleAddCattle = (event) => {
  event.preventDefault()

  if (!newCow.tag.trim() || !newCow.breed || !newCow.gender || !newCow.ageMonths) {
    setFormError('Semua kolom wajib diisi.')
    return
  }

  if (Number(newCow.ageMonths) <= 0) {
    setFormError('Umur sapi harus lebih dari 0 bulan.')
    return
  }

  const result = addCattle(newCow)

  if (!result.success) {
    setFormError(result.message)
    return
  }

setShowAddModal(false)
setActiveTab('active')
setSearch('')
setBreedFilter('Semua')
setGenderFilter('Semua')

setSuccessMessage(`Sapi ID ${result.data.id} berhasil ditambahkan!`)

setTimeout(() => {
  setSuccessMessage('')
}, 3000)
  setNewCow({
    id: '',
    tag: '',
    breed: '',
    gender: '',
    ageMonths: '',
  })
}
  return (
    <div className={styles.cattlePage}>
      {successMessage && (
  <div className={styles.successToast}>
    <span className={styles.toastCheck}>✓</span>
    <span>{successMessage}</span>
  </div>
)}
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>MANAJEMEN TERNAK</span>
          <h1>Daftar Sapi</h1>
          <p>Kelola dan pantau seluruh data sapi di peternakanmu.</p>
          
        </div>

<button
  className={styles.addButton}
  onClick={openAddModal}
>
  <Plus size={18} />
  Tambah Sapi
</button>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><Beef size={20} /></span>
          <div>
            <span>Total Sapi Aktif</span>
            <strong>{activeCattle.length}</strong>
          </div>
        </div>

        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><Archive size={20} /></span>
          <div>
            <span>Sapi Diarsipkan</span>
            <strong>{archivedCattle.length}</strong>
          </div>
        </div>
      </section>

<div className={styles.cattleTabs}>
  <button
    className={`${styles.cattleTab} ${activeTab === 'active' ? styles.activeTab : ''}`}
    onClick={() => setActiveTab('active')}
  >
    Sapi Aktif
    <span>{activeCattle.length}</span>
  </button>

  <button
    className={`${styles.cattleTab} ${activeTab === 'archived' ? styles.activeTab : ''}`}
    onClick={() => setActiveTab('archived')}
  >
    Diarsipkan
    <span>{archivedCattle.length}</span>
  </button>
</div>

      <section className={styles.listSection}>
        <div className={styles.listHeading}>
          <div>
            <h2>{activeTab === 'active' ? 'Seluruh Sapi Aktif' : 'Sapi Diarsipkan'}</h2>
<p>
  {activeTab === 'active'
    ? 'Data sapi yang sedang aktif di peternakan.'
    : 'Data sapi yang sudah tidak aktif beserta riwayatnya.'}
</p>
          </div>
          <span className={styles.resultCount}>
            {filteredCattle.length} sapi
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Cari ID sapi atau ear tag..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={styles.filterControl}>
            <SlidersHorizontal size={17} />
            <select
              value={breedFilter}
              onChange={(event) => setBreedFilter(event.target.value)}
            >
              <option value="Semua">Semua Jenis</option>
              <option value="Simental">Simental</option>
              <option value="Limousin">Limousin</option>
              <option value="PO">PO</option>
              <option value="Brahman">Brahman</option>
            </select>
          </div>

          <select
            className={styles.genderSelect}
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value)}
          >
            <option value="Semua">Semua Gender</option>
            <option value="Jantan">Jantan</option>
            <option value="Betina">Betina</option>
          </select>
        </div>

        <div className={styles.cattleList}>
          {filteredCattle.length > 0 ? (
            filteredCattle.map((cow) => (
             
<article className={styles.cattleRow} key={cow.id}>
  <div className={styles.cowIdentity}>
    <span className={styles.cowIcon}>
      <Beef size={21} />
    </span>
    <div>
      <strong>ID {cow.id}</strong>
      <span>{cow.tag}</span>
    </div>
  </div>

  <div className={styles.cowInfo}>
    <span>Jenis Sapi</span>
    <strong>{cow.breed}</strong>
  </div>

  <div className={styles.cowInfo}>
    <span>Gender</span>
    <strong>{cow.gender}</strong>
  </div>

  <div className={styles.cowInfo}>
    <span>Bobot Terakhir</span>
    <strong>
      {cow.latestWeight !== null ? `${cow.latestWeight} kg` : '—'}
    </strong>
  </div>

  <div className={styles.cowInfo}>
    <span>Pengukuran Terakhir</span>
    <strong>{formatDate(cow.lastMeasuredAt)}</strong>
  </div>

  <button
    className={styles.detailButton}
    aria-label={`Lihat detail sapi ${cow.id}`}
    onClick={() => navigate(`/app/sapi/${cow.id}`)}
  >
    <ChevronRight size={20} />
  </button>
</article>

            ))
          ) : (
            <div className={styles.emptyState}>
              <Beef size={28} />
              <strong>Sapi tidak ditemukan</strong>
              <span>Coba ubah kata kunci atau filter pencarian.</span>
            </div>
          )}
        </div>
      </section>
      
    
{showAddModal && createPortal(
  <div className={styles.modalOverlay}>
    <div className={styles.editModal}>
      <div className={styles.modalHeader}>
        <div>
          <span className={styles.eyebrow}>DATA TERNAK</span>
          <h2>Tambah Sapi</h2>
          <p>Masukkan informasi dasar sapi baru.</p>
        </div>

        <button
          type="button"
          className={styles.closeModalButton}
          onClick={() => setShowAddModal(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleAddCattle}>
        <div className={styles.formGroup}>
          <label>ID Sapi</label>
          <input value={newCow.id} readOnly />
          <small>ID dibuat otomatis dan tidak dapat diubah.</small>
        </div>

        <div className={styles.formGroup}>
          <label>Ear Tag</label>
          <input
            value={newCow.tag}
            onChange={(e) => setNewCow({ ...newCow, tag: e.target.value })}
            placeholder="Contoh: TAG-029"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Jenis Sapi</label>
          <select
            value={newCow.breed}
            onChange={(e) => setNewCow({ ...newCow, breed: e.target.value })}
          >
            <option value="">Pilih jenis sapi</option>
            <option value="Simental">Simental</option>
            <option value="Limousin">Limousin</option>
            <option value="PO">PO</option>
            <option value="Brahman">Brahman</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Jenis Kelamin</label>
          <select
            value={newCow.gender}
            onChange={(e) => setNewCow({ ...newCow, gender: e.target.value })}
          >
            <option value="">Pilih jenis kelamin</option>
            <option value="Jantan">Jantan</option>
            <option value="Betina">Betina</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Umur (bulan)</label>
          <input
            type="number"
            min="1"
            value={newCow.ageMonths}
            onChange={(e) => setNewCow({ ...newCow, ageMonths: e.target.value })}
            placeholder="Contoh: 18"
          />
        </div>

        {formError && (
          <p className={styles.formError}>{formError}</p>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => setShowAddModal(false)}
          >
            Batal
          </button>

          <button type="submit" className={styles.saveButton}>
            Simpan Sapi
          </button>
        </div>
      </form>
    </div>
  </div>,
  document.body
)}
</div>
  )
}

export default CattlePage
