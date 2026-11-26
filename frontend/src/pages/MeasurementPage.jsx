import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, PlusCircle, RefreshCw, Search } from 'lucide-react'
import cattleService from '../services/cattleService'
import styles from './MeasurementPage.module.css'

const emptyCow = { tag: '', breedId: '', gender: '', ageMonths: '' }
const weightFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof detail?.message === 'string') return detail.message
  if (Array.isArray(detail) && detail.every((item) => typeof item.msg === 'string')) {
    return detail.map((item) => item.msg).join(' ')
  }
  return fallback
}

function PhotoPreview({ file, label }) {
  const image = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return <img ref={image} alt={label} />
}

export default function MeasurementPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [measurementType, setMeasurementType] = useState('')
  const [activeCattle, setActiveCattle] = useState([])
  const [breeds, setBreeds] = useState([])
  const [selectedCow, setSelectedCow] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newCow, setNewCow] = useState(emptyCow)
  const [photo, setPhoto] = useState(null)
  const [view, setView] = useState('samping')
  const photoLabel = view === 'samping' ? 'Foto Samping' : 'Foto Belakang'
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isNew = measurementType === 'new'
  const cow = isNew ? newCow : activeCattle.find((item) => item.id === selectedCow)
  const breed = isNew
    ? breeds.find((item) => String(item.id_jenis) === newCow.breedId)?.nama_jenis
    : cow?.breed
  const query = searchQuery.trim().toLowerCase()
  const filteredCattle = activeCattle.filter((item) =>
    item.id.includes(query) || item.tag.toLowerCase().includes(query)
  )

  function goToStep(nextStep) {
    setError('')
    setStep(nextStep)
  }

  async function loadIdentityForm() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (isNew) {
        const list = await cattleService.getJenisSapi()
        if (!list.length) {
          setError('Daftar jenis sapi masih kosong.')
          return
        }
        setBreeds(list)
      } else {
        const cattle = await cattleService.getAllCattle({ status: 'active' })
        setActiveCattle(cattle)
      }
      goToStep(2)
    } catch (err) {
      setError(errorMessage(err, 'Gagal memuat data sapi. Periksa koneksi lalu coba lagi.'))
    } finally {
      setBusy(false)
    }
  }

  function updateCow(field, value) {
    setNewCow((previous) => ({ ...previous, [field]: value }))
    setError('')
  }

  function updatePhoto(file) {
    if (file && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Pilih foto dalam format JPG, PNG, atau WebP.')
      return
    }
    setPhoto(file)
    setError('')
  }

  async function recordMeasurement() {
    if (busy || !cow || !photo) return
    setBusy(true)
    setError('')
    try {
      const measurement = await cattleService.recordPhotoMeasurement({
        cattleId: isNew ? null : selectedCow,
        newCattle: isNew ? newCow : null,
        photo,
        view,
      })
      setResult(measurement)
      goToStep(4)
    } catch (err) {
      setError(errorMessage(err, err.response
        ? 'Pengukuran gagal diproses. Silakan coba lagi.'
        : 'Koneksi ke server terputus. Periksa riwayat pengukuran sebelum mengirim ulang.'))
    } finally {
      setBusy(false)
    }
  }

  function restart() {
    setMeasurementType('')
    setNewCow(emptyCow)
    setSearchQuery('')
    setSelectedCow('')
    setPhoto(null)
    setResult(null)
    setView('samping')
    goToStep(1)
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PENGUKURAN</span>
          <h1>Ukur Bobot Sapi</h1>
          <p>Mulai pengukuran untuk sapi yang sudah terdaftar atau daftarkan sapi baru.</p>
        </div>
      </div>

      {step === 1 && (
        <section className={styles.selectionSection}>
          <div className={styles.sectionHeading}>
            <span>LANGKAH 01</span>
            <h2>Pilih jenis pengukuran</h2>
          </div>
          <div className={styles.optionGrid}>
            {[
              { type: 'existing', title: 'Sapi Lama', description: 'Tambahkan pengukuran pada riwayat sapi terdaftar.', Icon: RefreshCw },
              { type: 'new', title: 'Sapi Baru', description: 'Daftarkan identitas sapi bersama pengukuran pertamanya.', Icon: PlusCircle },
            ].map(({ type, title, description, Icon }) => (
              <button
                key={type}
                type="button"
                aria-pressed={measurementType === type}
                className={[styles.optionCard, measurementType === type && styles.selected].filter(Boolean).join(' ')}
                disabled={busy}
                onClick={() => {
                  if (measurementType !== type) setPhoto(null)
                  setMeasurementType(type)
                  setError('')
                }}
              >
                <div className={styles.optionIcon}><Icon size={23} /></div>
                <div className={styles.optionText}><h3>{title}</h3><p>{description}</p></div>
                <ArrowRight size={19} className={styles.optionArrow} />
              </button>
            ))}
          </div>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          {measurementType && (
            <div className={styles.selectionFooter}>
              <button type="button" className={styles.continueButton} disabled={busy} onClick={loadIdentityForm}>
                {busy ? 'Memuat data…' : 'Lanjutkan'} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {step === 2 && !isNew && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <button type="button" className={styles.backButton} onClick={() => goToStep(1)}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <span className={styles.eyebrow}>LANGKAH 02</span>
            <h2>Pilih sapi yang akan diukur</h2>
          </div>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input type="search" aria-label="Cari sapi" placeholder="Cari ID sapi atau ear tag..."
              value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
          <div className={styles.cattleList}>
            {filteredCattle.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === selectedCow}
                className={[styles.cattleOption, item.id === selectedCow && styles.cattleOptionSelected].filter(Boolean).join(' ')}
                onClick={() => {
                  if (item.id !== selectedCow) setPhoto(null)
                  setSelectedCow(item.id)
                }}
              >
                <div className={styles.cattleIdentity}>
                  <div className={styles.cattleAvatar}>{item.tag.slice(-2)}</div>
                  <div><strong>{item.tag}</strong><span>ID {item.id} · {item.breed}</span></div>
                </div>
                <div className={styles.cattleInfo}>
                  <div><span>Jenis kelamin</span><strong>{item.gender}</strong></div>
                  <div><span>Umur</span><strong>{item.ageMonths} bulan</strong></div>
                  <div>
                    <span>Bobot terakhir</span>
                    <strong className={styles.cattleWeight}>
                      {item.latestWeight == null ? 'Belum ada data' : weightFormat.format(item.latestWeight) + ' kg'}
                    </strong>
                  </div>
                </div>
                <div className={styles.cattleCheck}>{selectedCow === item.id && <Check size={17} />}</div>
              </button>
            ))}
            {filteredCattle.length === 0 && (
              <p className={styles.emptySearch}>
                {activeCattle.length ? 'Tidak ada sapi yang cocok dengan pencarian.' : 'Belum ada sapi aktif.'}
              </p>
            )}
          </div>
          <div className={styles.selectionFooter}>
            <button type="button" className={styles.continueButton} disabled={!cow} onClick={() => goToStep(3)}>
              Lanjutkan <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 2 && isNew && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <button type="button" className={styles.backButton} onClick={() => goToStep(1)}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <span className={styles.eyebrow}>LANGKAH 02</span>
            <h2>Daftarkan Sapi Baru</h2>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault()
            if (!newCow.tag.trim()) {
              setError('Isi ear tag sapi terlebih dahulu.')
              return
            }
            updateCow('tag', newCow.tag.trim())
            goToStep(3)
          }}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="cow-tag">Ear Tag</label>
                <input id="cow-tag" required maxLength={50} placeholder="Contoh: TAG-029"
                  value={newCow.tag} onChange={(event) => updateCow('tag', event.target.value)} />
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-breed">Jenis Sapi</label>
                <select id="cow-breed" required value={newCow.breedId} onChange={(event) => updateCow('breedId', event.target.value)}>
                  <option value="">Pilih jenis sapi</option>
                  {breeds.map((item) => (
                    <option key={item.id_jenis} value={item.id_jenis}>{item.nama_jenis}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-gender">Jenis Kelamin</label>
                <select id="cow-gender" required value={newCow.gender} onChange={(event) => updateCow('gender', event.target.value)}>
                  <option value="">Pilih jenis kelamin</option>
                  <option>Jantan</option>
                  <option>Betina</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-age">Umur Sapi (Bulan)</label>
                <input id="cow-age" type="number" required min="1" max="360" step="1" placeholder="Contoh: 18"
                  value={newCow.ageMonths} onChange={(event) => updateCow('ageMonths', event.target.value)} />
              </div>
            </div>
            {error && <p className={styles.formError} role="alert">{error}</p>}
            <div className={styles.selectionFooter}>
              <button type="submit" className={styles.continueButton}>Lanjutkan <ArrowRight size={16} /></button>
            </div>
          </form>
        </section>
      )}

      {step === 3 && cow && (
        <section className={styles.selectionSection} aria-busy={busy}>
          <div className={styles.stepHeader}>
            <button type="button" className={styles.backButton} disabled={busy} onClick={() => goToStep(2)}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2>Foto Pengukuran Sapi</h2>
            <p>Unggah satu foto sapi dari samping atau belakang. Pastikan seluruh tubuh sapi terlihat.</p>
          </div>
          <div className={styles.cowConfirmation}>
            <div>
              <span className={styles.confirmationLabel}>SAPI YANG DIUKUR</span>
              <h3>{cow.tag}</h3>
              <p>{breed} · {cow.gender} · {cow.ageMonths} bulan</p>
            </div>
            <span className={styles.confirmationBadge}>{isNew ? 'Sapi Baru' : 'Sapi Lama'}</span>
          </div>
          <div className={styles.photoGrid}>
            <div className={styles.formField}>
              <label htmlFor="photo-view">Sudut foto</label>
              <select id="photo-view" value={view} disabled={busy} onChange={(event) => {
                setView(event.target.value)
                setError('')
              }}>
                <option value="samping">Tampak samping</option>
                <option value="belakang">Tampak belakang</option>
              </select>
            </div>
            <div className={styles.photoCard}>
              {photo ? (
                <div className={styles.photoPreview}>
                  <PhotoPreview file={photo} label={photoLabel} />
                  <button type="button" className={styles.removePhoto} disabled={busy} onClick={() => updatePhoto(null)}>
                    Hapus foto
                  </button>
                </div>
              ) : (
                <label className={styles.uploadArea}>
                  <PlusCircle size={30} />
                  <strong>Pilih {photoLabel}</strong><span>JPG, PNG, atau WebP</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={photoLabel} disabled={busy}
                    onChange={(event) => updatePhoto(event.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </div>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <div className={styles.selectionFooter}>
            <span role="status">
              {busy
                ? 'Memverifikasi foto dan menghitung bobot…'
                : 'Pengukuran disimpan setelah foto terverifikasi sebagai sapi.'}
            </span>
            <button type="button" className={styles.continueButton} disabled={busy || !photo}
              onClick={recordMeasurement}>
              {busy ? 'Memproses…' : 'Estimasi & Simpan Pengukuran'} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <h2>Pengukuran tersimpan</h2>
            <p>{isNew ? 'Sapi baru dan pengukuran pertamanya tersimpan di Data Sapi.' : 'Hasil estimasi ditambahkan ke riwayat pengukuran sapi.'}</p>
          </div>
          <div className={styles.resultHero}>
            <span className={styles.resultEyebrow}>ESTIMASI BOBOT SAPI</span>
            <div className={styles.resultWeight}>{weightFormat.format(result.bobot_estimasi_kg)} <span>kg</span></div>
          </div>
          <div className={styles.resultInfo}>
            <div><span>ID Sapi</span><strong>{result.id_sapi}</strong></div>
            <div><span>Ear Tag</span><strong>{cow.tag}</strong></div>
            <div><span>Jenis Sapi</span><strong>{breed}</strong></div>
            <div><span>Tanggal Pengukuran</span><strong>{new Date(result.tanggal_ukur + 'T00:00:00').toLocaleDateString('id-ID')}</strong></div>
          </div>
          <div className={styles.resultPhotos}>
            <div><PhotoPreview file={photo} label={photoLabel} /><span>{photoLabel}</span></div>
          </div>
          <div className={styles.selectionFooter}>
            <button type="button" className={styles.backButton} onClick={restart}>
              <RefreshCw size={16} /> Ukur Sapi Lain
            </button>
            <button type="button" className={styles.continueButton} onClick={() => navigate('/app/sapi')}>
              Lihat Data Sapi <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
