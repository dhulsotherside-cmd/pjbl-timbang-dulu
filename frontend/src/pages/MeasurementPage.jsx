import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
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
    if (!file) return
    const url = URL.createObjectURL(file)
    if (image.current) image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return <img ref={image} alt={label || 'Foto sapi'} />
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

  // Photo & two-step commit states
  const [photo, setPhoto] = useState(null)
  const [estimatedWeight, setEstimatedWeight] = useState(null)
  const [finalResult, setFinalResult] = useState(null)

  // Loading & staged indicator states
  const [busy, setBusy] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
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

  // Tahap 1: Estimasi Bobot Berbasis AI (Preview)
  async function handleEstimateWeight() {
    if (busy || !cow || !photo) return
    setBusy(true)
    setError('')
    setLoadingStage('Memverifikasi citra foto sapi…')

    const timer1 = setTimeout(() => {
      setLoadingStage('Mensegmentasi kontur tubuh sapi…')
    }, 900)

    const timer2 = setTimeout(() => {
      setLoadingStage('Menghitung estimasi bobot sapi…')
    }, 1800)

    try {
      const preview = await cattleService.predictWeight(photo)
      clearTimeout(timer1)
      clearTimeout(timer2)
      const weight = Number(preview.estimated_weight_kg ?? preview.bobot)
      setEstimatedWeight(weight)
      goToStep(4) // Beralih ke layar review two-step commit
    } catch (err) {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setError(
        errorMessage(
          err,
          err.response
            ? 'Estimasi bobot gagal diproses. Pastikan foto sapi tampak jelas.'
            : 'Koneksi ke server terputus. Silakan coba lagi.'
        )
      )
    } finally {
      setBusy(false)
      setLoadingStage('')
    }
  }

  // Ulangi estimasi: reset foto & estimasi tanpa menghapus data sapi terpilih/terisi
  function handleRetryEstimate() {
    setPhoto(null)
    setEstimatedWeight(null)
    setError('')
    goToStep(3)
  }

  // Tahap 2: Simpan Permanen (Commit) ke DB & Neon Object Storage (.webp)
  async function handleSaveMeasurement() {
    if (busy || !cow || !photo || estimatedWeight === null) return
    setBusy(true)
    setError('')
    setLoadingStage('Mengompresi ke WebP & menyimpan data ke cloud Neon…')

    try {
      const saved = await cattleService.savePhotoMeasurement({
        photo,
        weight: estimatedWeight,
        cattleId: isNew ? null : selectedCow,
        newCattle: isNew ? newCow : null,
      })
      setFinalResult(saved)
      goToStep(5) // Berpindah ke layar sukses
    } catch (err) {
      setError(
        errorMessage(
          err,
          err.response
            ? 'Gagal menyimpan pengukuran. Silakan coba lagi.'
            : 'Koneksi server terputus saat menyimpan.'
        )
      )
    } finally {
      setBusy(false)
      setLoadingStage('')
    }
  }

  function restart() {
    setMeasurementType('')
    setNewCow(emptyCow)
    setSearchQuery('')
    setSelectedCow('')
    setPhoto(null)
    setEstimatedWeight(null)
    setFinalResult(null)
    goToStep(1)
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PENGUKURAN BOBOT</span>
          <h1>Ukur Bobot Sapi</h1>
          <p>Estimasi bobot ternak akurat berbasis Computer Vision dengan alur tinjau dua tahap (Two-Step Commit).</p>
        </div>
      </div>

      {/* LANGKAH 1: Pilih Tipe Sapi */}
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

      {/* LANGKAH 2: Pilih / Daftarkan Sapi */}
      {step === 2 && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <button type="button" className={styles.stepBack} disabled={busy} onClick={() => goToStep(1)}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2>{isNew ? 'Daftarkan sapi baru' : 'Pilih sapi dari peternakan'}</h2>
          </div>

          {isNew ? (
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="cow-tag">Nomor Ear Tag *</label>
                <input id="cow-tag" value={newCow.tag} placeholder="Contoh: ST-042" disabled={busy}
                  onChange={(event) => updateCow('tag', event.target.value)} />
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-breed">Jenis Sapi *</label>
                <select id="cow-breed" value={newCow.breedId} disabled={busy}
                  onChange={(event) => updateCow('breedId', event.target.value)}>
                  <option value="">Pilih jenis sapi</option>
                  {breeds.map((item) => (
                    <option key={item.id_jenis} value={item.id_jenis}>{item.nama_jenis}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-gender">Jenis Kelamin *</label>
                <select id="cow-gender" value={newCow.gender} disabled={busy}
                  onChange={(event) => updateCow('gender', event.target.value)}>
                  <option value="">Pilih jenis kelamin</option>
                  <option value="Jantan">Jantan</option>
                  <option value="Betina">Betina</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="cow-age">Umur (Bulan) *</label>
                <input id="cow-age" type="number" min="1" max="360" value={newCow.ageMonths} placeholder="Contoh: 18" disabled={busy}
                  onChange={(event) => updateCow('ageMonths', event.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input value={searchQuery} placeholder="Cari ear tag atau ID sapi…" disabled={busy}
                  onChange={(event) => setSearchQuery(event.target.value)} />
              </div>
              <div className={styles.cowList}>
                {filteredCattle.map((item) => (
                  <button key={item.id} type="button"
                    className={[styles.cowCard, selectedCow === item.id && styles.selected].filter(Boolean).join(' ')}
                    disabled={busy} onClick={() => { setSelectedCow(item.id); setError('') }}>
                    <div className={styles.cowCardHeader}>
                      <strong>{item.tag}</strong>
                      <span className={styles.cowId}>ID #{item.id}</span>
                    </div>
                    <p>{item.breed} · {item.gender} · {item.ageMonths} bulan</p>
                    {item.latestWeight && (
                      <span className={styles.cowWeight}>Bobot terakhir: {weightFormat.format(item.latestWeight)} kg</span>
                    )}
                  </button>
                ))}
                {!filteredCattle.length && (
                  <p className={styles.emptySearch}>
                    {activeCattle.length ? 'Tidak ada sapi yang cocok dengan pencarian.' : 'Belum ada sapi aktif di peternakan Anda.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && <p className={styles.formError} role="alert">{error}</p>}
          <div className={styles.selectionFooter}>
            <button
              type="button"
              className={styles.continueButton}
              disabled={busy || (isNew ? (!newCow.tag || !newCow.breedId || !newCow.gender || !newCow.ageMonths) : !selectedCow)}
              onClick={() => goToStep(3)}
            >
              Lanjut ke Foto <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 3: Unggah Foto dengan Panduan Visual & Alert Positif */}
      {step === 3 && cow && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <button type="button" className={styles.stepBack} disabled={busy} onClick={() => goToStep(2)}>
              <ArrowLeft size={16} /> Ubah Identitas Sapi
            </button>
            <h2>Foto Pengukuran Sapi</h2>
            <p>Unggah satu foto sapi tampak samping penuh untuk memulai estimasi bobot.</p>
          </div>

          <div className={styles.cowConfirmation}>
            <div>
              <span className={styles.confirmationLabel}>SAPI YANG DIUKUR</span>
              <h3>{cow.tag}</h3>
              <p>{breed} · {cow.gender} · {cow.ageMonths} bulan</p>
            </div>
            <span className={styles.confirmationBadge}>{isNew ? 'Sapi Baru' : 'Sapi Lama'}</span>
          </div>

          {/* Panduan Visual / Alert Positif */}
          <div className={styles.guidanceBox} role="note">
            <Info size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Panduan Pengambilan Foto Optimal</strong>
              Foto tampak samping penuh (dari ujung moncong kepala hingga paha belakang) dengan pencahayaan cukup dan latar bersih memberikan akurasi estimasi model AI terbaik.
            </div>
          </div>

          <div className={styles.photoGrid}>
            <div className={styles.photoCard}>
              {photo ? (
                <div className={styles.photoPreview}>
                  <PhotoPreview file={photo} label="Foto Samping Sapi" />
                  <button type="button" className={styles.removePhoto} disabled={busy} onClick={() => updatePhoto(null)}>
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label className={styles.uploadArea}>
                  <PlusCircle size={32} />
                  <strong>Pilih Foto Samping Sapi</strong>
                  <span>Format: JPG, PNG, atau WebP</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Foto Samping Sapi"
                    disabled={busy}
                    onChange={(event) => updatePhoto(event.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </div>

          {error && <p className={styles.formError} role="alert">{error}</p>}

          <div className={styles.selectionFooter}>
            <div role="status">
              {busy ? (
                <div className={styles.stagedLoading}>
                  <div className={styles.spinner} />
                  <span>{loadingStage}</span>
                </div>
              ) : (
                <span>Foto akan dianalisis model AI tanpa mengubah data peternakan.</span>
              )}
            </div>
            <button
              type="button"
              className={styles.continueButton}
              disabled={busy || !photo}
              onClick={handleEstimateWeight}
            >
              {busy ? 'Menganalisis…' : 'Estimasi Bobot Sapi'} <Sparkles size={16} />
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 4: Review Estimasi (Two-Step Commit) */}
      {step === 4 && cow && photo && estimatedWeight !== null && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <span className={styles.eyebrow}>TINJAU ESTIMASI BOBOT</span>
            <h2>Hasil Estimasi Bobot Sapi</h2>
            <p>Periksa hasil estimasi di bawah ini. Anda dapat mengulangi pengambilan foto atau menyimpan secara permanen ke riwayat peternakan.</p>
          </div>

          <div className={styles.resultHero}>
            <span className={styles.resultEyebrow}>ESTIMASI BOBOT AI</span>
            <div className={styles.resultWeight}>
              {weightFormat.format(estimatedWeight)} <span>kg</span>
            </div>
          </div>

          <div className={styles.resultInfo}>
            <div><span>Ear Tag</span><strong>{cow.tag}</strong></div>
            <div><span>Jenis Sapi</span><strong>{breed}</strong></div>
            <div><span>Jenis Kelamin</span><strong>{cow.gender}</strong></div>
            <div><span>Umur</span><strong>{cow.ageMonths} Bulan</strong></div>
          </div>

          <div className={styles.resultPhotos}>
            <div>
              <PhotoPreview file={photo} label="Foto Samping yang Dianalisis" />
              <span>Foto Tampak Samping (Siap dikompresi ke WebP)</span>
            </div>
          </div>

          <div className={styles.resultNotice}>
            <strong>Konfirmasi Penyimpanan</strong>
            <p>
              Dengan menekan tombol <em>Simpan Pengukuran</em>, citra akan dikompresi ke format WebP teroptimasi dan dicatat permanen ke database peternakan Anda.
            </p>
          </div>

          {error && <p className={styles.formError} role="alert">{error}</p>}

          <div className={styles.selectionFooter}>
            <button
              type="button"
              className={styles.backButton}
              disabled={busy}
              onClick={handleRetryEstimate}
            >
              <RefreshCw size={16} /> Ulangi Estimasi
            </button>

            <button
              type="button"
              className={styles.continueButton}
              disabled={busy}
              onClick={handleSaveMeasurement}
            >
              {busy ? (
                <>
                  <div className={styles.spinner} /> Menyimpan…
                </>
              ) : (
                <>
                  <Check size={16} /> Simpan Pengukuran
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 5: Konfirmasi Sukses Tersimpan */}
      {step === 5 && finalResult && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <div className={styles.successIcon} style={{ width: 44, height: 44, borderRadius: '50%', background: '#d7ebd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f592d', marginBottom: 12 }}>
              <Check size={26} />
            </div>
            <h2>Pengukuran Tersimpan Permanen!</h2>
            <p>
              {isNew
                ? 'Sapi baru dan pengukuran perdananya telah berhasil dicatat.'
                : 'Hasil pengukuran telah ditambahkan ke riwayat data sapi.'}
            </p>
          </div>

          <div className={styles.resultHero}>
            <span className={styles.resultEyebrow}>BOBOT TERUKUR</span>
            <div className={styles.resultWeight}>
              {weightFormat.format(finalResult.bobot)} <span>kg</span>
            </div>
          </div>

          <div className={styles.resultInfo}>
            <div><span>ID Sapi</span><strong>{finalResult.id_sapi}</strong></div>
            <div><span>Ear Tag</span><strong>{cow.tag}</strong></div>
            <div><span>Tanggal Ukur</span><strong>{new Date(finalResult.tanggal_ukur + 'T00:00:00').toLocaleDateString('id-ID')}</strong></div>
            {finalResult.pbh_info && (
              <div><span>Status PBH</span><strong>{finalResult.pbh_info.pbh_kg_hari} kg/hari ({finalResult.pbh_info.status})</strong></div>
            )}
          </div>

          <div className={styles.selectionFooter}>
            <button type="button" className={styles.backButton} onClick={restart}>
              <RefreshCw size={16} /> Ukur Sapi Lain
            </button>
            <button
              type="button"
              className={styles.continueButton}
              onClick={() => navigate(`/app/sapi/${finalResult.id_sapi}`)}
            >
              Lihat Detail Sapi <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
