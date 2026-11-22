import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  Beef,
  CalendarDays,
  Scale,
  TrendingUp,
  Pencil,
  Archive,
  ChevronDown,
  VenusAndMars,
  ChartNoAxesCombined,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import cattleService from '../services/cattleService'
import styles from './CattleDetailPage.module.css'

function formatDate(date) {
  if (!date) return 'Belum ada pengukuran'

  const parsedDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    const fallbackDate = new Date(date)
    if (Number.isNaN(fallbackDate.getTime())) return 'Tanggal tidak valid'
    return fallbackDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return parsedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function calculateAge(months) {
  if (!months || months < 1) return '—'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths} bulan`
  if (remainingMonths === 0) return `${years} tahun`

  return `${years} tahun ${remainingMonths} bulan`
}

function CattleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cow, setCow] = useState(null)
  const [history, setHistory] = useState([])
  const [jenisSapiList, setJenisSapiList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [editForm, setEditForm] = useState({
    breed: '',
    gender: '',
    ageMonths: '',
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [cattleData, measurementsData, jenisData] = await Promise.all([
        cattleService.getCattleDetail(id),
        cattleService.getCattleMeasurements(id),
        cattleService.getJenisSapi().catch(() => []),
      ])
      setCow(cattleData)
      setHistory(measurementsData)
      setJenisSapiList(jenisData)
    } catch (err) {
      console.error('Gagal memuat detail sapi:', err)
      setCow(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const latest = history.length > 0 ? history[0] : null

  function openEditModal() {
    if (!cow) return
    setEditForm({
      breed: cow.breed,
      gender: cow.gender,
      ageMonths: String(cow.ageMonths),
    })
    setShowEditModal(true)
  }

  async function handleSaveProfile() {
    const age = Number(editForm.ageMonths)

    if (!Number.isInteger(age) || age < 1) {
      alert('Umur sapi harus berupa angka bulan yang valid.')
      return
    }

    try {
      setIsActionLoading(true)
      const updated = await cattleService.updateCattle(id, {
        breed: editForm.breed,
        gender: editForm.gender,
        ageMonths: age,
      })
      setCow(updated)
      setShowEditModal(false)
    } catch (err) {
      console.error('Gagal menyimpan profil:', err)
      alert(err.response?.data?.detail || 'Gagal menyimpan perubahan profil sapi.')
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleArchiveCattle() {
    try {
      setIsActionLoading(true)
      await cattleService.archiveCattle(id)
      setShowArchiveConfirm(false)
      navigate('/app/sapi')
    } catch (err) {
      console.error('Gagal mengarsipkan sapi:', err)
      alert(err.response?.data?.detail || 'Gagal mengarsipkan sapi.')
    } finally {
      setIsActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.notFound}>
          <Beef size={32} />
          <h2>Memuat profil sapi...</h2>
          <p>Mengambil data dari server peternakan.</p>
        </div>
      </div>
    )
  }

  if (!cow) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.notFound}>
          <Beef size={32} />
          <h2>Data sapi tidak ditemukan</h2>
          <p>Sapi dengan ID {id} tidak ditemukan atau bukan milik peternakan Anda.</p>
          <Link to="/app/sapi">
            <ArrowLeft size={16} /> Kembali ke Daftar Sapi
          </Link>
        </div>
      </div>
    )
  }

  // Data grafik pertumbuhan diurutkan secara ascending (kronologis)
  const chartData = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => ({
      date: formatDate(item.date),
      weight: item.weight,
    }))

  const measurementA = history.find((item) => item.id === dateA)
  const measurementB = history.find((item) => item.id === dateB)

  const dayInterval =
    measurementA && measurementB
      ? Math.round(
          Math.abs(new Date(measurementB.date) - new Date(measurementA.date)) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  const dailyGain =
    measurementA && measurementB && dayInterval > 0
      ? (measurementB.weight - measurementA.weight) / dayInterval
      : null

  return (
    <div className={styles.detailPage}>
      <Link to="/app/sapi" className={styles.backLink}>
        <ArrowLeft size={17} />
        Kembali ke Daftar Sapi
      </Link>

      <header className={styles.profileHeader}>
        <div className={styles.profileIdentity}>
          <div className={styles.profileIcon}>
            <Beef size={30} />
          </div>

          <div>
            <span className={styles.eyebrow}>
              {cow.status === 'archived' ? 'PROFIL TERNAK (DIARSIPKAN)' : 'PROFIL TERNAK'}
            </span>
            <h1>ID Sapi {cow.id}</h1>
            <p>
              {cow.tag} · {cow.breed} · {cow.gender}
            </p>
          </div>
        </div>

        <div className={styles.profileActions}>
          <button className={styles.secondaryButton} onClick={openEditModal}>
            <Pencil size={16} />
            Edit Profil
          </button>
          {cow.status !== 'archived' && (
            <button
              className={styles.archiveButton}
              onClick={() => setShowArchiveConfirm(true)}
            >
              <Archive size={16} />
              Arsipkan
            </button>
          )}
        </div>
      </header>

      <section className={styles.overviewGrid}>
        <article className={styles.weightHighlight}>
          <div className={styles.cardTop}>
            <span>BOBOT TERAKHIR</span>
            <div className={styles.weightIcon}>
              <Scale size={19} />
            </div>
          </div>

          <strong>
            {latest ? latest.weight : cow.latestWeight ?? '—'}
            <small>kg</small>
          </strong>

          <div className={styles.weightDate}>
            <CalendarDays size={15} />
            {formatDate(latest?.date || cow.lastMeasuredAt)}
          </div>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.cardTop}>
            <span>Jenis Sapi</span>
            <div className={styles.infoIcon}>
              <Beef size={18} />
            </div>
          </div>
          <strong>{cow.breed}</strong>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.cardTop}>
            <span>Jenis Kelamin</span>
            <div className={styles.infoIcon}>
              <VenusAndMars size={18} />
            </div>
          </div>
          <strong>{cow.gender}</strong>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.cardTop}>
            <span>Umur</span>
            <div className={styles.infoIcon}>
              <CalendarDays size={18} />
            </div>
          </div>
          <strong>{calculateAge(cow.ageMonths)}</strong>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.cardTop}>
            <span>Total Pengukuran</span>
            <div className={styles.infoIcon}>
              <ChartNoAxesCombined size={18} />
            </div>
          </div>
          <strong>{history.length || cow.totalMeasurements || 1} kali</strong>
        </article>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PERKEMBANGAN BOBOT</span>
            <h2>Riwayat pertumbuhan</h2>
          </div>
          <span className={styles.measurementCount}>
            {chartData.length} data
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 10, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cattleWeightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#496B50" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#496B50" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#d7d8cc"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858d84', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858d84', fontSize: 10 }}
                  domain={['dataMin - 20', 'dataMax + 20']}
                />
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Bobot']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #d7d8cc',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#496B50"
                  strokeWidth={2.5}
                  fill="url(#cattleWeightGradient)"
                  activeDot={{ r: 5, fill: '#203C32' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>Belum ada data pengukuran untuk sapi ini.</p>
        )}
      </section>

      <section className={styles.pbhPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ANALISIS PERTUMBUHAN</span>
            <h2>Pertambahan bobot harian</h2>
            <p>Pilih dua catatan pengukuran untuk menghitung PBH.</p>
          </div>
          <TrendingUp size={23} />
        </div>

        <div className={styles.pbhSelectors}>
          <label>
            <span>Pengukuran awal</span>
            <div>
              <select
                value={dateA}
                onChange={(event) => {
                  setDateA(event.target.value)
                  setDateB('')
                }}
              >
                <option value="">Pilih pengukuran</option>
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDate(item.date)} · {item.weight} kg
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>

          <label>
            <span>Pengukuran akhir</span>
            <div>
              <select
                value={dateB}
                onChange={(event) => setDateB(event.target.value)}
                disabled={!dateA}
              >
                <option value="">Pilih pengukuran</option>
                {history
                  .filter((item) => {
                    const first = history.find((record) => record.id === dateA)
                    return first && item.date > first.date
                  })
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatDate(item.date)} · {item.weight} kg
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
        </div>

        <div className={styles.pbhResult}>
          <span>PERTAMBAHAN BOBOT HARIAN (PBH)</span>
          <strong>
            {dailyGain !== null ? `${dailyGain.toFixed(2)} kg/hari` : '—'}
          </strong>
          {dailyGain !== null && (
            <p>
              Selama {dayInterval} hari · Perubahan bobot{' '}
              {(measurementB.weight - measurementA.weight).toFixed(1)} kg
            </p>
          )}
          {dailyGain === null && (
            <p>Pilih pengukuran awal dan akhir untuk melihat hasil.</p>
          )}
        </div>
      </section>

      <section className={styles.historyPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CATATAN PENGUKURAN</span>
            <h2>Riwayat pengukuran</h2>
          </div>
          <span className={styles.measurementCount}>
            {history.length} catatan
          </span>
        </div>

        <div className={styles.historyList}>
          {history.map((item, index) => (
            <article className={styles.historyItem} key={item.id}>
              <div className={styles.historyIcon}>
                <Scale size={18} />
              </div>
              <div className={styles.historyInfo}>
                <strong>Pengukuran #{history.length - index}</strong>
                <span>{formatDate(item.date)}</span>
              </div>
              <strong className={styles.historyWeight}>{item.weight} kg</strong>
            </article>
          ))}

          {history.length === 0 && <p>Belum ada riwayat pengukuran.</p>}
        </div>
      </section>

      {showEditModal &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <section
              className={styles.editModal}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.eyebrow}>PROFIL TERNAK</span>
                  <h2>Edit Profil Sapi</h2>
                  <p>
                    ID {cow.id} · {cow.tag}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setShowEditModal(false)}
                  aria-label="Tutup modal"
                >
                  ×
                </button>
              </div>

              <div className={styles.modalFields}>
                <label>
                  ID Sapi
                  <input value={cow.id} disabled />
                </label>

                <label>
                  Ear Tag
                  <input value={cow.tag} disabled />
                </label>

                <label>
                  Jenis Sapi
                  <select
                    value={editForm.breed}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        breed: event.target.value,
                      })
                    }
                  >
                    {jenisSapiList.map((j) => (
                      <option key={j.id_jenis} value={j.nama_jenis}>
                        {j.nama_jenis}
                      </option>
                    ))}
                    {jenisSapiList.length === 0 && (
                      <>
                        <option value="Simental">Simental</option>
                        <option value="Limousin">Limousin</option>
                        <option value="PO">PO</option>
                        <option value="Brahman">Brahman</option>
                      </>
                    )}
                  </select>
                </label>

                <label>
                  Jenis Kelamin
                  <select
                    value={editForm.gender}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        gender: event.target.value,
                      })
                    }
                  >
                    <option value="Jantan">Jantan</option>
                    <option value="Betina">Betina</option>
                  </select>
                </label>

                <label>
                  Umur (bulan)
                  <input
                    type="number"
                    min="1"
                    value={editForm.ageMonths}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        ageMonths: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowEditModal(false)}
                  disabled={isActionLoading}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSaveProfile}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}

      {showArchiveConfirm &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={() => setShowArchiveConfirm(false)}
          >
            <section
              className={styles.editModal}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.eyebrow}>KONFIRMASI TINDAKAN</span>
                  <h2>Arsipkan Sapi?</h2>
                  <p>
                    ID {cow.id} · {cow.tag}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setShowArchiveConfirm(false)}
                >
                  ×
                </button>
              </div>

              <p className={styles.archiveDescription}>
                Sapi ini akan dipindahkan ke daftar arsip dan tidak lagi muncul
                sebagai sapi aktif. Seluruh riwayat pengukurannya tetap tersimpan.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowArchiveConfirm(false)}
                  disabled={isActionLoading}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className={styles.archiveConfirmButton}
                  onClick={handleArchiveCattle}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  )
}

export default CattleDetailPage
