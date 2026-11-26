import { useEffect } from 'react'
import FarmScene from '../components/landing/FarmScene'
import styles from './LandingPage.module.css'
import sapiSamping from '../assets/images/sapi-samping.png'
import logo from '../assets/images/logo-timbangdulu.png'

export default function LandingPage() {
  useEffect(() => {
  const elements = document.querySelectorAll(
    `.${styles.features} [data-reveal]`
  )

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.isVisible)
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  )

  elements.forEach((element) => observer.observe(element))

  return () => observer.disconnect()
}, [])
  return (
    <main className={styles.landingPage}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <a href="#beranda" className={styles.logo}>
  <img src={logo} alt="" className={styles.brandLogo} />
  <span>TimbangDulu</span>
</a>

        <div className={styles.navLinks}>
          <a href="#beranda">Beranda</a>
          <a href="#fitur">Fitur</a>
          <a href="#tentang">Tentang</a>
        </div>

        <a href="/register" className={styles.navCta}>
          Daftar Sekarang 
        </a>
      </nav>

      {/* Hero */}
      <section id="beranda" className={styles.hero}>
        <div className={styles.heroScene}>
  <FarmScene />
</div>

        <div className={styles.heroContent}>
          <h1>
            Cara Baru
            <br />
            Mengelola
            <br />
            <span>Peternakan.</span>
          </h1>

          <p className={styles.heroDescription}>
            Estimasi bobot sapi dari foto. Pantau pertumbuhan
            dan kelola data ternak dalam satu platform.
          </p>

          <div className={styles.heroActions}>
            <a href="/register" className={styles.primaryButton}>
              Mulai Sekarang 
            </a>

          </div>
        </div>
      </section>

      {/* Features */}
      
      {/* Features */}
      
      {/* Features */}
      <section id="fitur" className={styles.features}>
        <div className={styles.featuresOrbit} aria-hidden="true">
          <span className={styles.orbitCircle} />
          <span className={styles.orbitDot} />
          <span className={styles.orbitCross}>✳</span>
        </div>

        <div className={styles.featuresHeader}>
          <div className={styles.featuresHeading} data-reveal>
            <p className={styles.eyebrow}>APA YANG BISA DILAKUKAN</p>
            <h2>
              Lebih dari
              <br />
              sekadar <span>menimbang.</span>
            </h2>
          </div>

<div className={styles.featuresIntro} data-reveal>
  <p>
    Kenali, kelola, dan pantau perkembangan ternak.
    Semua kebutuhan pengelolaan sapi dalam satu platform.
  </p>
</div>
        </div>

        <div className={styles.featureComposition}>
          <article className={styles.featureMain} data-reveal>
            <div className={styles.featureMainTop}>
              <span className={styles.featureTag}>
                01 — ESTIMASI BOBOT
              </span>
            </div>

            <div className={styles.featureMainCopy}>
  <h3>
    Estimasi bobot
    <br />
    dari foto sapi.
  </h3>
  <p>
    Unggah satu foto tampak samping atau belakang untuk mendapatkan estimasi bobot sapi.
  </p>
</div>
            
<div className={styles.featureVisual}>
  <div className={styles.measurementPreview}>
    <div className={styles.previewHeader}>
      <span>ANALISIS FOTO</span>
      <span className={styles.previewStatus}>
        <i /> SELESAI
      </span>
    </div>

    <div className={styles.previewPhotos}>
      <div className={styles.previewPhoto}>
        <img src={sapiSamping} alt="Tampak samping sapi" />
        <span>FOTO SAMPING</span>
      </div>
    </div>

    <div className={styles.previewResult}>
      <div>
        <span className={styles.resultLabel}>ESTIMASI BOBOT</span>
        <strong>178,08 <small>kg</small></strong>
      </div>
      <span className={styles.resultIcon}>↗</span>
    </div>
  </div>
</div>


            <div className={styles.featureMainBottom}>
  <span>ESTIMASI BOBOT BERBASIS FOTO</span>
</div>
          </article>

          <div className={styles.featureSecondary}>
            <article className={styles.featureSmall} data-reveal>
              <div className={styles.featureSmallTop}>
                <span className={styles.featureTag}>02 — MANAJEMEN</span>
                <span className={styles.featureSmallNumber}>02</span>
              </div>

              <div className={styles.managementVisual}>
  <div className={styles.managementPreview}>
    <div className={styles.managementPreviewHeader}>
      <span>DAFTAR TERNAK</span>
      <span>03 SAPI</span>
    </div>

    <div className={styles.cattleRow}>
      <span className={styles.cattleAvatar}>S1</span>
      <div className={styles.cattleInfo}>
        <strong>Sapi 01</strong>
        <small>ID-001 · Jantan</small>
      </div>
      <span className={styles.cattleIndicator} />
    </div>

    <div className={styles.cattleRow}>
      <span className={styles.cattleAvatar}>S2</span>
      <div className={styles.cattleInfo}>
        <strong>Sapi 02</strong>
        <small>ID-002 · Betina</small>
      </div>
      <span className={styles.cattleIndicator} />
    </div>

    <div className={styles.cattleRow}>
      <span className={styles.cattleAvatar}>S3</span>
      <div className={styles.cattleInfo}>
        <strong>Sapi 03</strong>
        <small>ID-003 · Jantan</small>
      </div>
      <span className={styles.cattleIndicator} />
    </div>
  </div>
</div>

              <div className={styles.featureSmallCopy}>
                <h3>
  Kelola data
  sapi dengan mudah.
</h3>
                <p>
  Simpan identitas dan informasi setiap sapi
  dalam satu pengelolaan yang terorganisir.
</p>
              </div>

            </article>

            <article className={styles.featureSmall} data-reveal>
              <div className={styles.featureSmallTop}>
                <span className={styles.featureTag}>03 — MONITORING</span>
                <span className={styles.featureSmallNumber}>03</span>
              </div>

              <div className={styles.monitorVisual}>
  <div className={styles.monitorPreview}>
    <div className={styles.monitorHeader}>
      <div>
        <span>RIWAYAT BOBOT</span>
        <strong>Sapi 01</strong>
      </div>
      <span className={styles.monitorPeriod}>6 BULAN</span>
    </div>

    <div className={styles.monitorChart}>
      <div className={styles.monitorValue}>
        <strong>485</strong>
        <small>kg</small>
      </div>

      <svg viewBox="0 0 320 100" preserveAspectRatio="none">
        <path
          className={styles.monitorArea}
          d="M0 78 C45 72 55 62 95 65 S150 48 190 51 S250 27 320 16 L320 100 L0 100 Z"
        />
        <path
          className={styles.monitorLine}
          d="M0 78 C45 72 55 62 95 65 S150 48 190 51 S250 27 320 16"
        />
        <circle cx="0" cy="78" r="3" />
        <circle cx="95" cy="65" r="3" />
        <circle cx="190" cy="51" r="3" />
        <circle cx="320" cy="16" r="4" />
      </svg>
    </div>

    <div className={styles.monitorDates}>
      <span>JUN</span>
      <span>JUL</span>
      <span>AGS</span>
      <span>SEP</span>
    </div>
  </div>
</div>

              <div className={styles.featureSmallCopy}>
                <h3>
  Pantau perubahan
  <br />
  bobot ternak.
</h3>
                <p>
  Lihat riwayat pengukuran untuk memantau
  perkembangan bobot setiap sapi dari waktu ke waktu.
</p>
              </div>

            </article>
          </div>
        </div>
      </section>



      {/* Product Showcase */}
      <section id="tentang" className={styles.showcase}>
        <div className={styles.showcaseHeader}>
          <p className={styles.eyebrow}>MANAJEMEN TERPADU</p>
          <h2>
            Kenali perkembangan
            <br />
            peternakan Anda.
          </h2>
        </div>

        <div className={styles.showcaseBody}>
          <div className={styles.showcaseVisual}>
            <div className={styles.showcaseImage}>
              <img
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85"
                alt="Hamparan lahan pertanian"
                loading="lazy"
              />
            </div>

            

<div className={styles.showcasePanel}>
  <div className={styles.panelTop}>
    <span>TIMBANGDULU / RINGKASAN</span>
    <span>PREVIEW</span>
  </div>

  <p className={styles.panelLabel}>PENGELOLAAN TERNAK</p>
  <h3>Satu tempat untuk seluruh data peternakan.</h3>

  <div className={styles.panelMetrics}>
  <div>
    <div className={styles.metricValue}>
      <strong>12</strong>
      <span>ekor sapi aktif</span>
    </div>
  </div>

  <div>
    <div className={styles.metricValue}>
      <strong>48</strong>
      <span>catatan pengukuran</span>
    </div>
  </div>
</div>

  <div className={styles.panelFooter}>
    <span>DATA SAPI TERSIMPAN</span>
    <span>BOBOT TERCATAT</span>
  </div>
</div>


          </div>

          <div className={styles.showcaseContent}>
            <p>
              Simpan data sapi, catat hasil pengukuran,
              dan pantau perkembangan ternak dalam
              satu tempat.
            </p>

            <a href="/register" className={styles.showcaseLink}>
              Mulai kelola peternakan 
            </a>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaImage}>
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=85"
            alt=""
            loading="lazy"
          />
        </div>

        <div className={styles.ctaContent}>
          <p className={styles.eyebrow}>
            LANGKAH BARU PETERNAKAN
          </p>

          <h2>
            Kelola data ternak,
            <br />
            pantau bobotnya,
            <br />
            <span>dengan lebih mudah.</span>
          </h2>

          <a href="/register" className={styles.ctaLink}>
            Daftar Sekarang 
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <a href="#beranda" className={styles.footerLogo}>
  <img src={logo} alt="" className={styles.footerBrandLogo} />
  <span>TimbangDulu</span>
</a>
          <p>
            Teknologi sederhana untuk pengelolaan
            peternakan yang lebih terarah.
          </p>

          <div className={styles.footerLinks}>
            <a href="#beranda">Beranda</a>
            <a href="#fitur">Fitur</a>
            <a href="#tentang">Tentang</a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© 2026 TimbangDulu</span>
        </div>
      </footer>
    </main>
  )
}
