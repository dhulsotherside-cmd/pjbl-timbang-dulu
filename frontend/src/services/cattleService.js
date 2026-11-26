import api from './api'

/**
 * Service adapter untuk API Manajemen Sapi dan Pengukuran (Backend FastAPI).
 */
export const cattleService = {
  /**
   * Mengambil daftar master ras/jenis sapi.
   */
  async getJenisSapi() {
    const response = await api.get('/sapi/jenis')
    return response.data
  },

  /**
   * Mengambil daftar sapi milik peternak yang sedang login.
   * @param {Object} params - { status: 'all' | 'active' | 'archived', search: string }
   */
  async getCattleList(params = {}) {
    const response = await api.get('/sapi/', { params })
    return response.data.map(transformCattleData)
  },

  async getAllCattle(params = {}) {
    const cattle = []
    const limit = 200
    let page
    do {
      page = await cattleService.getCattleList({ ...params, skip: cattle.length, limit })
      cattle.push(...page)
    } while (page.length === limit)
    return cattle
  },

  async recordPhotoMeasurement({ cattleId, newCattle, photo, view }) {
    const form = new FormData()
    form.append(`foto_${view}`, photo)
    if (cattleId != null) {
      form.append('id_sapi', cattleId)
    } else {
      form.append('ear_tag', newCattle.tag.trim())
      form.append('id_jenis', newCattle.breedId)
      form.append('jenis_kelamin', newCattle.gender)
      form.append('umur_bulan', newCattle.ageMonths)
    }

    const response = await api.post('/pengukuran/predict', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },

  /**
   * Mengambil detail sapi berdasarkan ID.
   * @param {string|number} id - ID Sapi
   */
  async getCattleDetail(id) {
    const response = await api.get(`/sapi/${id}`)
    return transformCattleData(response.data)
  },

  /**
   * Mendaftarkan sapi baru dengan bobot awal manual.
   * @param {Object} data - { tag, breed, gender, ageMonths, bobotAwal, tanggalMasuk }
   */
  async createCattle(data) {
    const payload = {
      ear_tag: data.tag || data.ear_tag,
      breed: data.breed,
      id_jenis: data.id_jenis || undefined,
      jenis_kelamin: data.gender || data.jenis_kelamin,
      umur_bulan: Number(data.ageMonths || data.umur_bulan),
      bobot_awal: Number(data.bobotAwal || data.bobot_awal || data.initialWeight || data.weight),
      tanggal_masuk: data.tanggalMasuk || data.tanggal_masuk || new Date().toISOString().slice(0, 10),
    }

    const response = await api.post('/sapi/', payload)
    return transformCattleData(response.data)
  },

  /**
   * Memperbarui profil sapi (breed, gender, ageMonths).
   * @param {string|number} id - ID Sapi
   * @param {Object} data - Field yang diperbarui
   */
  async updateCattle(id, data) {
    const payload = {}
    if (data.breed !== undefined) payload.breed = data.breed
    if (data.gender !== undefined) payload.jenis_kelamin = data.gender
    if (data.ageMonths !== undefined) payload.umur_bulan = Number(data.ageMonths)
    if (data.tag !== undefined) payload.ear_tag = data.tag

    const response = await api.put(`/sapi/${id}`, payload)
    return transformCattleData(response.data)
  },

  /**
   * Mengarsipkan sapi (soft delete / sapi keluar).
   * @param {string|number} id - ID Sapi
   */
  async archiveCattle(id) {
    const response = await api.patch(`/sapi/${id}/archive`)
    return transformCattleData(response.data)
  },

  /**
   * Mengaktifkan kembali sapi yang terarsip.
   * @param {string|number} id - ID Sapi
   */
  async unarchiveCattle(id) {
    const response = await api.patch(`/sapi/${id}/unarchive`)
    return transformCattleData(response.data)
  },

  /**
   * Mengambil riwayat catatan pengukuran sapi tertentu.
   * @param {string|number} id - ID Sapi
   */
  async getCattleMeasurements(id) {
    const response = await api.get(`/pengukuran/sapi/${id}`)
    return response.data.map((m) => ({
      id: String(m.id_pengukuran),
      cattleId: String(m.id_sapi),
      date: m.tanggal_ukur,
      weight: Number(m.bobot),
      pbhKgHari: m.pbh_info?.pbh_kg_hari ?? null,
      status: m.pbh_info?.status ?? null,
    }))
  },
}

/**
 * Normalisasi data backend ke bentuk properti yang ramah komponen frontend.
 */
function transformCattleData(item) {
  if (!item) return null

  return {
    ...item,
    id: String(item.id_sapi),
    tag: item.ear_tag || item.tag,
    breed: item.jenis?.nama_jenis || item.breed || 'Tidak diketahui',
    gender: item.jenis_kelamin || item.gender,
    ageMonths: item.umur_bulan || item.ageMonths,
    status: item.tanggal_keluar ? 'archived' : 'active',
    latestWeight: item.bobot_terakhir ?? item.latestWeight ?? null,
    lastMeasuredAt: item.tanggal_ukur_terakhir ?? item.lastMeasuredAt ?? null,
    totalMeasurements: item.total_pengukuran ?? 0,
  }
}

export default cattleService
