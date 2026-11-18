
import { useEffect, useRef, useState } from 'react'
import {
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Search,
  Check,
  ArrowLeft,
} from 'lucide-react'
import styles from './MeasurementPage.module.css'
import {
  getActiveCattle,
  getLatestMeasurement,
    generateNextCattleId,
      addCattle,
  addMeasurement,
} from '../mocks/cattleData'

export default function MeasurementPage() {
    const [measurementType, setMeasurementType] = useState('')
const [step, setStep] = useState(1)
const [selectedCow, setSelectedCow] = useState('')
const [searchQuery, setSearchQuery] = useState('')
const [isSaving, setIsSaving] = useState(false)
const [saveError, setSaveError] = useState('')
const [newCow, setNewCow] = useState(() => ({
  id: generateNextCattleId(),
  tag: '',
  breed: '',
  gender: '',
  ageMonths: '',
}))

const [formError, setFormError] = useState('')

const [photos, setPhotos] = useState({
  side: null,
  rear: null,
})

const [photoPreviews, setPhotoPreviews] = useState({
  side: '',
  rear: '',
})

const previewUrls = useRef({
  side: '',
  rear: '',
})

useEffect(() => {
  const urls = previewUrls.current

  return () => {
    Object.values(urls).forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })
  }
}, [])


const [photoError, setPhotoError] = useState('')

const [isEstimating, setIsEstimating] = useState(false)
const [predictionResult, setPredictionResult] = useState(null)

const handlePhotoChange = (position, file) => {
  if (!file) return

  if (!file.type.startsWith('image/')) {
    setPhotoError('File harus berupa gambar.')
    return
  }

  if (previewUrls.current[position]) {
    URL.revokeObjectURL(previewUrls.current[position])
  }

  const previewUrl = URL.createObjectURL(file)

  previewUrls.current[position] = previewUrl

  setPhotos((prev) => ({
    ...prev,
    [position]: file,
  }))

  setPhotoPreviews((prev) => ({
    ...prev,
    [position]: previewUrl,
  }))

  setPhotoError('')
}

const handleRemovePhoto = (position) => {
  if (previewUrls.current[position]) {
    URL.revokeObjectURL(previewUrls.current[position])
    previewUrls.current[position] = ''
  }

  setPhotos((prev) => ({
    ...prev,
    [position]: null,
  }))

  setPhotoPreviews((prev) => ({
    ...prev,
    [position]: '',
  }))

  setPhotoError('')
}

const handleEstimate = () => {
  if (!photos.side || !photos.rear) {
    setPhotoError('Unggah kedua foto terlebih dahulu.')
    return
  }

  setIsEstimating(true)
  setPredictionResult(null)

  setTimeout(() => {
    const age = measurementType === 'new'
      ? Number(newCow.ageMonths)
      : Number(selectedCowData?.ageMonths || 18)

    const gender = measurementType === 'new'
      ? newCow.gender
      : selectedCowData?.gender

    const baseWeight = age * 12 + (gender === 'Jantan' ? 80 : 40)
    const variation = Math.round(Math.random() * 20 - 10)

    const estimatedWeight = Math.max(
      50,
      Math.round(baseWeight + variation)
    )

    setPredictionResult({
      weight: estimatedWeight,
      confidence: 'Simulasi',
      createdAt: new Date().toISOString(),
    })

    setIsEstimating(false)
    setStep(4)
  }, 1500)
}

const handleSaveMeasurement = () => {
  if (!predictionResult || isSaving) return

  setIsSaving(true)
  setSaveError('')

  try {
    let cattleId

    // Jika sapi baru, buat profilnya terlebih dahulu
    if (measurementType === 'new') {
      const cattleResult = addCattle({
        ...newCow,
        ageMonths: Number(newCow.ageMonths),
      })

      if (!cattleResult.success) {
        setSaveError(cattleResult.message)
        setIsSaving(false)
        return
      }

      cattleId = cattleResult.data.id
    } else {
      cattleId = selectedCow
    }

    // Simpan hasil pengukuran
    const measurementResult = addMeasurement(
      cattleId,
      predictionResult.weight
    )

    if (!measurementResult.success) {
      setSaveError(measurementResult.message)
      setIsSaving(false)
      return
    }

    setStep(5)
  } catch (error) {
    console.error('Gagal menyimpan pengukuran:', error)
    setSaveError('Terjadi kesalahan saat menyimpan pengukuran.')
  } finally {
    setIsSaving(false)
  }
}

const activeCattle = getActiveCattle()

const filteredCattle = activeCattle.filter((cow) => {
  const query = searchQuery.toLowerCase()

  return (
    cow.id.toLowerCase().includes(query) ||
    cow.tag.toLowerCase().includes(query)
  )
})

const selectedCowData = activeCattle.find(
  (cow) => cow.id === selectedCow
)

const formatWeight = (cattleId) => {
  const latest = getLatestMeasurement(cattleId)

  return latest ? `${latest.weight} kg` : 'Belum ada data'
}

const handleContinue = () => {
  if (!measurementType) return

  setStep(2)
}

const handleNewCowChange = (field, value) => {
  setNewCow((prev) => ({
    ...prev,
    [field]: value,
  }))

  setFormError('')
}

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PENGUKURAN</span>
          <h1>Ukur Bobot Sapi</h1>
          <p>
            Mulai pengukuran bobot untuk sapi yang sudah terdaftar
            atau daftarkan sapi baru.
          </p>
        </div>
      </div>

      {step === 1 && (
        <section className={styles.selectionSection}>
          <div className={styles.sectionHeading}>
            <span>LANGKAH 01</span>
            <h2>Pilih jenis pengukuran</h2>
            <p>Tentukan sapi yang ingin kamu ukur.</p>
          </div>

          <div className={styles.optionGrid}>
            <button
              type="button"
              className={`${styles.optionCard} ${
                measurementType === 'existing' ? styles.selected : ''
              }`}
              onClick={() => setMeasurementType('existing')}
            >
              <div className={styles.optionIcon}>
                <RefreshCw size={23} />
              </div>
              <div className={styles.optionText}>
                <h3>Sapi Lama</h3>
                <p>
                  Pilih sapi yang sudah terdaftar untuk
                  menambahkan riwayat pengukuran baru.
                </p>
              </div>
              <ArrowRight size={19} className={styles.optionArrow} />
            </button>

            <button
              type="button"
              className={`${styles.optionCard} ${
                measurementType === 'new' ? styles.selected : ''
              }`}
              onClick={() => setMeasurementType('new')}
            >
              <div className={styles.optionIcon}>
                <PlusCircle size={23} />
              </div>
              <div className={styles.optionText}>
                <h3>Sapi Baru</h3>
                <p>
                  Daftarkan identitas sapi sekaligus melakukan
                  pengukuran pertamanya.
                </p>
              </div>
              <ArrowRight size={19} className={styles.optionArrow} />
            </button>
          </div>

          {measurementType && (
            <div className={styles.selectionFooter}>
              <span>
                {measurementType === 'existing'
                  ? 'Kamu memilih pengukuran sapi lama.'
                  : 'Kamu memilih pengukuran sapi baru.'}
              </span>
              <button
                type="button"
                className={styles.continueButton}
                onClick={handleContinue}
              >
                Lanjutkan <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {step === 2 && measurementType === 'existing' && (
        <section className={styles.selectionSection}>
          <div className={styles.stepHeader}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={17} /> Kembali
            </button>

            <span className={styles.eyebrow}>LANGKAH 02</span>
            <h2>Pilih sapi yang akan diukur</h2>
            <p>
              Pilih satu sapi aktif untuk menambahkan pengukuran baru.
            </p>
          </div>

          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Cari ID sapi atau ear tag..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className={styles.cattleList}>
            
{filteredCattle.map((cow) => {
  const isSelected = selectedCow === cow.id

  return (
    <button
      type="button"
      key={cow.id}
      className={`${styles.cattleOption} ${
        isSelected ? styles.cattleOptionSelected : ''
      }`}
      onClick={() => setSelectedCow(cow.id)}
    >
      <div className={styles.cattleIdentity}>
        <div className={styles.cattleAvatar}>
          {cow.tag.slice(-2)}
        </div>
        <div>
          <strong>{cow.tag}</strong>
          <span>ID {cow.id} · {cow.breed}</span>
        </div>
      </div>

      <div className={styles.cattleInfo}>
        <div>
          <span>Jenis kelamin</span>
          <strong>{cow.gender}</strong>
        </div>
        <div>
          <span>Umur</span>
          <strong>{cow.ageMonths} bulan</strong>
        </div>
        <div>
          <span>Bobot terakhir</span>
          <strong className={styles.cattleWeight}>
            {formatWeight(cow.id)}
          </strong>
        </div>
      </div>

      <div className={styles.cattleCheck}>
        {isSelected && <Check size={17} />}
      </div>
    </button>
  )
})}


            {filteredCattle.length === 0 && (
              <div className={styles.emptySearch}>
                Tidak ada sapi yang cocok dengan pencarian.
              </div>
            )}
          </div>

          <div className={styles.selectionFooter}>
            <span>
              {selectedCowData
                ? `Terpilih: ${selectedCowData.tag}`
                : 'Pilih satu sapi untuk melanjutkan.'}
            </span>

            <button
              type="button"
              className={styles.continueButton}
              disabled={!selectedCow}
              onClick={() => setStep(3)}
            >
              Lanjutkan <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

{step === 2 && measurementType === 'new' && (
  <section className={styles.selectionSection}>
    <div className={styles.stepHeader}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => setStep(1)}
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div>
        <h2>Daftarkan Sapi Baru</h2>
        <p>Lengkapi identitas sapi sebelum melakukan pengukuran.</p>
      </div>
    </div>

    <div className={styles.formGrid}>
      <div className={styles.formField}>
        <label>ID Sapi</label>
        <input
          type="text"
          value={newCow.id}
          readOnly
        />
        <small>ID dibuat otomatis dan tidak dapat diubah.</small>
      </div>

      <div className={styles.formField}>
        <label>Ear Tag</label>
        <input
          type="text"
          placeholder="Contoh: TAG-029"
          value={newCow.tag}
          onChange={(e) =>
            handleNewCowChange('tag', e.target.value)
          }
        />
      </div>

      <div className={styles.formField}>
        <label>Jenis Sapi</label>
        <select
          value={newCow.breed}
          onChange={(e) =>
            handleNewCowChange('breed', e.target.value)
          }
        >
          <option value="">Pilih jenis sapi</option>
          <option value="Simental">Simental</option>
          <option value="Limousin">Limousin</option>
          <option value="Brahman">Brahman</option>
          <option value="PO">Peranakan Ongole (PO)</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      <div className={styles.formField}>
        <label>Jenis Kelamin</label>
        <select
          value={newCow.gender}
          onChange={(e) =>
            handleNewCowChange('gender', e.target.value)
          }
        >
          <option value="">Pilih jenis kelamin</option>
          <option value="Jantan">Jantan</option>
          <option value="Betina">Betina</option>
        </select>
      </div>

      <div className={styles.formField}>
        <label>Umur Sapi (Bulan)</label>
        <input
          type="number"
          min="1"
          placeholder="Contoh: 18"
          value={newCow.ageMonths}
          onChange={(e) =>
            handleNewCowChange('ageMonths', e.target.value)
          }
        />
      </div>
    </div>

    {formError && (
      <p className={styles.formError}>{formError}</p>
    )}

    <div className={styles.selectionFooter}>
      <button
        type="button"
        className={styles.continueButton}
        onClick={() => {
          const tag = newCow.tag.trim()

          if (!tag || !newCow.breed || !newCow.gender || !newCow.ageMonths) {
            setFormError('Lengkapi seluruh data sapi terlebih dahulu.')
            return
          }

          if (Number(newCow.ageMonths) < 1) {
            setFormError('Umur sapi minimal 1 bulan.')
            return
          }

          const tagExists = activeCattle.some(
            (cow) => cow.tag.toLowerCase() === tag.toLowerCase()
          )

          if (tagExists) {
            setFormError('Ear Tag sudah digunakan oleh sapi aktif.')
            return
          }

          setNewCow((prev) => ({
            ...prev,
            tag,
            ageMonths: Number(prev.ageMonths),
          }))

          setFormError('')
          setStep(3)
        }}
      >
        Lanjutkan
        <ArrowRight size={16} />
      </button>
    </div>
  </section>
)}

      {step === 3 && (
  <section className={styles.selectionSection}>
    <div className={styles.stepHeader}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => setStep(2)}
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div>
        <h2>Foto Pengukuran Sapi</h2>
        <p>Unggah dua foto dari sudut berbeda agar proses estimasi dapat dilakukan.</p>
      </div>
    </div>

    <div className={styles.cowConfirmation}>
      <div>
        <span className={styles.confirmationLabel}>SAPI YANG DIUKUR</span>
        <h3>
          {measurementType === 'new'
            ? `Sapi ${newCow.id}`
            : `Sapi ${selectedCowData?.id || selectedCow}`}
        </h3>
        <p>
          {measurementType === 'new'
            ? `${newCow.tag} · ${newCow.breed} · ${newCow.gender}`
            : `${selectedCowData?.tag || '-'} · ${selectedCowData?.breed || '-'} · ${selectedCowData?.gender || '-'}`}
        </p>
      </div>
      <span className={styles.confirmationBadge}>
        {measurementType === 'new' ? 'Sapi Baru' : 'Sapi Lama'}
      </span>
    </div>

    <div className={styles.photoGrid}>
      <div className={styles.photoCard}>
        <div className={styles.photoCardHeader}>
          <div>
            <h3>Foto Samping</h3>
            <p>Ambil foto seluruh tubuh sapi dari sisi samping.</p>
          </div>
          <span>01</span>
        </div>

        {photos.side ? (
          <div className={styles.photoPreview}>
            <img src={photoPreviews.side} alt="Preview foto samping sapi" />
            <button
              type="button"
              onClick={() => handleRemovePhoto('side')}
              className={styles.removePhoto}
            >
              Hapus Foto
            </button>
          </div>
        ) : (
          <label className={styles.uploadArea}>
            <PlusCircle size={30} />
            <strong>Pilih Foto Samping</strong>
            <span>JPG, JPEG, atau PNG</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handlePhotoChange('side', e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      <div className={styles.photoCard}>
        <div className={styles.photoCardHeader}>
          <div>
            <h3>Foto Belakang</h3>
            <p>Ambil foto sapi dari arah belakang.</p>
          </div>
          <span>02</span>
        </div>

        {photos.rear ? (
          <div className={styles.photoPreview}>
            <img src={photoPreviews.rear} alt="Preview foto belakang sapi" />
            <button
              type="button"
              onClick={() => handleRemovePhoto('rear')}
              className={styles.removePhoto}
            >
              Hapus Foto
            </button>
          </div>
        ) : (
          <label className={styles.uploadArea}>
            <PlusCircle size={30} />
            <strong>Pilih Foto Belakang</strong>
            <span>JPG, JPEG, atau PNG</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handlePhotoChange('rear', e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    </div>

    {photoError && (
      <p className={styles.formError}>{photoError}</p>
    )}

    <div className={styles.photoNotice}>
      <strong>Perhatikan sebelum mengunggah</strong>
      <p>
        Pastikan seluruh tubuh sapi terlihat jelas, foto tidak buram,
        dan objek tidak terhalang.
      </p>
    </div>

    <div className={styles.selectionFooter}>
      <button
  type="button"
  className={styles.continueButton}
  disabled={!photos.side || !photos.rear || isEstimating}
  onClick={handleEstimate}
>
  {isEstimating ? 'Memproses Estimasi...' : 'Lanjutkan ke Estimasi'}
  {!isEstimating && <ArrowRight size={16} />}
</button>
    </div>
  </section>
)}

{step === 4 && predictionResult && (
  <section className={styles.selectionSection}>
    <div className={styles.stepHeader}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => setStep(3)}
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div>
        <h2>Hasil Estimasi Bobot</h2>
        <p>Periksa hasil estimasi sebelum menyimpan pengukuran.</p>
      </div>
    </div>

    <div className={styles.resultHero}>
      <span className={styles.resultEyebrow}>ESTIMASI BOBOT SAPI</span>

      <div className={styles.resultWeight}>
        {predictionResult.weight}
        <span>kg</span>
      </div>

      <span className={styles.resultStatus}>
        Hasil simulasi prediksi
      </span>
    </div>

    <div className={styles.resultInfo}>
      <div>
        <span>ID Sapi</span>
        <strong>
          {measurementType === 'new'
            ? newCow.id
            : selectedCowData?.id}
        </strong>
      </div>

      <div>
        <span>Ear Tag</span>
        <strong>
          {measurementType === 'new'
            ? newCow.tag
            : selectedCowData?.tag}
        </strong>
      </div>

      <div>
        <span>Jenis Sapi</span>
        <strong>
          {measurementType === 'new'
            ? newCow.breed
            : selectedCowData?.breed}
        </strong>
      </div>

      <div>
        <span>Jenis Kelamin</span>
        <strong>
          {measurementType === 'new'
            ? newCow.gender
            : selectedCowData?.gender}
        </strong>
      </div>
    </div>

    <div className={styles.resultPhotos}>
      <div>
        <img src={photoPreviews.side} alt="Foto samping sapi" />
        <span>Foto Samping</span>
      </div>

      <div>
        <img src={photoPreviews.rear} alt="Foto belakang sapi" />
        <span>Foto Belakang</span>
      </div>
    </div>

    <div className={styles.resultNotice}>
      <strong>Periksa hasil estimasi</strong>
      <p>
        Ini merupakan hasil simulasi untuk keperluan pengembangan
        antarmuka. Bobot belum dihasilkan oleh model AI sebenarnya.
      </p>
    </div>

    <div className={styles.selectionFooter}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => {
          setPredictionResult(null)
          setStep(3)
        }}
      >
        <RefreshCw size={15} />
        Ukur Ulang
      </button>

      <button
        type="button"
        className={styles.continueButton}
        onClick={handleSaveMeasurement}
        disabled={isSaving}
      >
        <Check size={16} />
        {isSaving ? 'Menyimpan...' : 'Simpan Pengukuran'}
      </button>
      {saveError && (
  <p className={styles.formError}>{saveError}</p>
)}
    </div>

    {formError && (
      <p className={styles.formError}>{formError}</p>
    )}
  </section>
)}

{step === 5 && (
  <section className={styles.selectionSection}>
    <div className={styles.successContent}>
      <div className={styles.successIcon}>
        <Check size={32} />
      </div>

      <span className={styles.successEyebrow}>
        PENGUKURAN BERHASIL
      </span>

      <h2>Data Pengukuran Tersimpan!</h2>

      <p>
        Hasil estimasi bobot sapi berhasil disimpan
        ke dalam riwayat pengukuran.
      </p>

      <div className={styles.successSummary}>
        <div>
          <span>ID Sapi</span>
          <strong>
            {measurementType === 'new'
              ? newCow.id
              : selectedCowData?.id}
          </strong>
        </div>

        <div>
          <span>Bobot Terukur</span>
          <strong>{predictionResult?.weight} kg</strong>
        </div>
      </div>

      <button
        type="button"
        className={styles.continueButton}
        onClick={() => {
          setStep(1)
          setMeasurementType('')
          setSelectedCow('')
          setSearchQuery('')
          setPhotos({ side: null, rear: null })
          setPredictionResult(null)
          setPhotoError('')
          setFormError('')
          setSaveError('')
          setNewCow({
            id: generateNextCattleId(),
            tag: '',
            breed: '',
            gender: '',
            ageMonths: '',
          })
        }}
      >
        Kembali ke Pengukuran
        <ArrowRight size={16} />
      </button>
    </div>
  </section>
)}
    </main>
  )
}
