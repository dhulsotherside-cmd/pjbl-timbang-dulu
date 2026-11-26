import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Beef,
  Scale,
  Activity,
  CalendarDays,
  ArrowRight,
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

import api from '../services/api'

import styles from './DashboardPage.module.css'

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

function formatDate(date) {
  if (!date) return 'Tanggal tidak tersedia'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Tanggal tidak tersedia'
  }

  return parsedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/dashboard', { signal: controller.signal })
      .then(({ data }) => setSummary(data))
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
    return () => controller.abort()
  }, [])

  if (loadError) return <p role="alert">Ringkasan peternakan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
  if (!summary) return <p role="status">Memuat ringkasan peternakan…</p>

  const { jantan: maleCount, betina: femaleCount, sapi_aktif: totalGender } = summary
  const malePercentage = totalGender ? (maleCount / totalGender) * 100 : 0
  const weightData = summary.tren_bulanan.map(({ bulan, bobot }) => ({
    month: monthNames[Number(bulan.slice(5)) - 1] + ' ' + bulan.slice(0, 4),
    weight: bobot,
  }))
  const latestWeight = weightData.at(-1)?.weight ?? '—'
  const trendIncreasing = weightData.length > 1 && latestWeight >= weightData[0].weight
  const recentActivities = summary.aktivitas.map((item) => ({
    id: item.id_pengukuran,
    cattleId: item.id_sapi,
    earTag: item.ear_tag,
    date: formatDate(item.tanggal_ukur),
    weight: item.bobot + ' kg',
  }))

  return (
    <div className={styles.dashboard}>
      <section className={styles.welcomeSection}>
        <div>
          <span className={styles.eyebrow}>RINGKASAN PETERNAKAN</span>
          <h2>Selamat datang kembali.</h2>
          <p>
            Pantau perkembangan bobot dan kondisi ternak
            dari satu tempat.
          </p>
        </div>

        <div className={styles.dateLabel}>
          <CalendarDays size={16} />
          <span>{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
      </section>

      <section className={styles.statsSection}>
        <article className={styles.primaryStat}>
          <div className={styles.statTop}>
            <span>Total Sapi Aktif</span>
            <Beef size={21} />
          </div>
          <div className={styles.statValue}>{summary.sapi_aktif}</div>
          <div className={styles.statBottom}>
            <span>Terdaftar di peternakan</span>
            <span className={styles.statAccent}>EKOR</span>
          </div>
        </article>

        <article className={styles.secondaryStat}>
          <div className={styles.statTop}>
            <span>Total Pengukuran</span>
            <Scale size={21} />
          </div>
          <div className={styles.statValue}>
            {summary.total_pengukuran}
          </div>
          <div className={styles.statBottom}>
            <span>Seluruh riwayat pengukuran</span>
          </div>
        </article>

        <article className={styles.secondaryStat}>
          <div className={styles.statTop}>
            <span>Rata-rata Bobot</span>
            <Activity size={21} />
          </div>
          <div className={styles.statValue}>
            {summary.rata_bobot ?? '—'} <small>kg</small>
          </div>
          <div className={styles.statBottom}>
            <span>Dari sapi aktif yang terukur</span>
          </div>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>PERKEMBANGAN TERNAK</span>
              <h3>Tren rata-rata bobot</h3>
            </div>
            <span className={styles.periodLabel}>
              {weightData.length} bulan data
            </span>
          </div>

          <div className={styles.chartSummary}>
            <strong>{latestWeight} kg</strong>
            <span>
              {trendIncreasing && <ArrowUpRight size={15} />}
              {trendIncreasing ? 'Tren meningkat' : 'Perkembangan bobot'}
            </span>
          </div>

          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weightData}
                margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858d84', fontSize: 11 }}
                  dy={10}
                />

                <YAxis
  width={38}
  axisLine={false}
  tickLine={false}
  tick={{ fill: '#858d84', fontSize: 10 }}
  tickMargin={6}
  tickCount={4}
  domain={['dataMin - 20', 'dataMax + 20']}
/>
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Rata-rata bobot']}
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
                  fill="url(#weightGradient)"
                  activeDot={{ r: 5, fill: '#203C32' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className={styles.chartNote}>
            Rata-rata berdasarkan riwayat pengukuran sapi aktif.
          </p>
        </article>

        <article className={styles.distributionPanel}>
          <span className={styles.eyebrow}>KOMPOSISI TERNAK</span>
          <h3>Jenis kelamin sapi</h3>

          <div className={styles.distributionVisual}>
            <div
              className={styles.donut}
              style={{
                background: `conic-gradient(
                  #496B50 0% ${malePercentage}%,
                  #A2AD78 ${malePercentage}% 100%
                )`,
              }}
            >
              <div>
                <strong>{totalGender}</strong>
                <span>Total sapi</span>
              </div>
            </div>
          </div>

          <div className={styles.legend}>
            <div>
              <span className={styles.legendMale} />
              <span>Jantan</span>
              <strong>{maleCount}</strong>
            </div>
            <div>
              <span className={styles.legendFemale} />
              <span>Betina</span>
              <strong>{femaleCount}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.activityPanel}>
        <div className={styles.activityHeader}>
          <div>
            <span className={styles.eyebrow}>CATATAN TERBARU</span>
            <h3>Aktivitas pengukuran</h3>
          </div>

          <a href="/app/sapi" className={styles.viewAll}>
            Lihat data sapi <ArrowRight size={15} />
          </a>
        </div>

        <div className={styles.activityList}>
          {recentActivities.map((activity) => (
            <div className={styles.activityItem} key={activity.id}>
              <div className={styles.activityIcon}>
                <Scale size={18} />
              </div>

              <div className={styles.activityInfo}>
                <strong>{activity.earTag}</strong>
                <span>ID Sapi {activity.cattleId}</span>
              </div>

              <div className={styles.activityWeight}>
                <strong>{activity.weight}</strong>
                <span>{activity.date}</span>
              </div>
            </div>
          ))}

          {recentActivities.length === 0 && (
            <p>Belum ada aktivitas pengukuran.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
