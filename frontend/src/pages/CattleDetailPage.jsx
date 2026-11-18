
import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  getAllCattle,
  getCattleMeasurements,
  getLatestMeasurement,
  updateCattleProfile,
  archiveCattle,
} from '../mocks/cattleData'
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



import styles from './CattleDetailPage.module.css'

function formatDate(date) {
  if (!date) return 'Belum ada pengukuran'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Tanggal tidak valid'
  }

  return parsedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
function calculateAge(months) {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths} bulan`
  if (remainingMonths === 0) return `${years} tahun`

  return `${years} tahun ${remainingMonths} bulan`
}

function CattleDetailPage() {
  const { id } = useParams()

  const cow = getAllCattle().find((item) => item.id === id)
  const navigate = useNavigate()
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const history = getCattleMeasurements(id)
  const latest = getLatestMeasurement(id)

  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
const [editForm, setEditForm] = useState({
  breed: '',
  gender: '',
  ageMonths: '',
})
function openEditModal() {
  setEditForm({
    breed: cow.breed,
    gender: cow.gender,
    ageMonths: String(cow.ageMonths),
  })

  setShowEditModal(true)
}

function handleSaveProfile() {
  const age = Number(editForm.ageMonths)

  if (!Number.isInteger(age) || age < 1) {
    alert('Umur sapi harus berupa angka bulan yang valid.')
    return
  }

  updateCattleProfile(id, {
    breed: editForm.breed,
    gender: editForm.gender,
    ageMonths: age,
  })

  setShowEditModal(false)
}

function handleArchiveCattle() {
  const result = archiveCattle(id)

  if (result) {
    setShowArchiveConfirm(false)
    navigate('/app/sapi')
  }
}

  if (!cow) {
    return (
      <div className={styles.notFound}>
        <Beef size={32} />
        <h2>Data sapi tidak ditemukan</h2>
        <p>Periksa kembali ID sapi yang ingin kamu buka.</p>
        <Link to="/app/sapi">
          <ArrowLeft size={16} /> Kembali ke Daftar Sapi
        </Link>
      </div>
    )
  }

  const chartData = history.map((item) => ({
    date: formatDate(item.date),
    weight: item.weight,
  }))

  const measurementA = history.find((item) => item.id === dateA)
  const measurementB = history.find((item) => item.id === dateB)

  const dayInterval =
    measurementA && measurementB
      ? Math.round(
          (new Date(`${measurementB.date}T00:00:00`) -
            new Date(`${measurementA.date}T00:00:00`)) /
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
            <span className={styles.eyebrow}>PROFIL TERNAK</span>
            <h1>ID Sapi {cow.id}</h1>
            <p>{cow.tag} · {cow.breed} · {cow.gender}</p>
          </div>
    </div>

        <div className={styles.profileActions}>
<button
  className={styles.secondaryButton}
  onClick={openEditModal}
>
  <Pencil size={16} />
  Edit Profil
</button>
<button
  className={styles.archiveButton}
  onClick={() => setShowArchiveConfirm(true)}
>
  <Archive size={16} />
  Arsipkan
</button>
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
      {latest ? latest.weight : '—'}
      <small>kg</small>
    </strong>

    <div className={styles.weightDate}>
      <CalendarDays size={15} />
      {formatDate(latest?.date)}
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
    <strong>{history.length} kali</strong>
  </article>
</section>

      <section className={styles.chartPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PERKEMBANGAN BOBOT</span>
            <h2>Riwayat pertumbuhan</h2>
          </div>
          <span className={styles.measurementCount}>
            {history.length} data
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
          {[...history].reverse().map((item, index) => (
            <article className={styles.historyItem} key={item.id}>
              <div className={styles.historyIcon}>
                <Scale size={18} />
              </div>
              <div className={styles.historyInfo}>
                <strong>Pengukuran #{history.length - index}</strong>
                <span>{formatDate(item.date)}</span>
              </div>
              <strong className={styles.historyWeight}>
                {item.weight} kg
              </strong>
            </article>
          ))}

          {history.length === 0 && (
            <p>Belum ada riwayat pengukuran.</p>
          )}
        </div>
      </section>

      {showEditModal && createPortal(
        <div
          className={styles.modalOverlay}
          onClick={() => setShowEditModal(false)}
        >
          <section
            className={styles.editModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>PROFIL TERNAK</span>
                <h2>Edit Profil Sapi</h2>
                <p>ID {cow.id} · {cow.tag}</p>
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
                  <option value="Simental">Simental</option>
                  <option value="Limousin">Limousin</option>
                  <option value="PO">PO</option>
                  <option value="Brahman">Brahman</option>
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
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.saveButton}
                onClick={() => {
  console.log('TOMBOL SIMPAN DIKLIK')
  handleSaveProfile()
}}
              >
                Simpan Perubahan
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
{showArchiveConfirm && createPortal(
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
          <p>ID {cow.id} · {cow.tag}</p>
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
        Sapi ini akan dipindahkan ke daftar arsip dan tidak lagi
        muncul sebagai sapi aktif. Seluruh riwayat pengukurannya
        tetap tersimpan.
      </p>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => setShowArchiveConfirm(false)}
        >
          Batal
        </button>

        <button
          type="button"
          className={styles.archiveConfirmButton}
          onClick={handleArchiveCattle}
        >
          Ya, Arsipkan
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
