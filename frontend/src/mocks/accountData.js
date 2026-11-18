
export const PROFILE_STORAGE_KEY = 'timbangdulu_account_profile'

export const defaultProfile = {
  nama_user: 'Admin Peternakan',
  username: 'admin',
  email: 'admin@timbangdulu.id',
  nama_peternakan: 'Peternakan TimbangDulu',
  alamat: '',
  no_telp: '',
  created_at: '2026-01-15T08:00:00.000Z',
}

export function loadAccountProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)

    if (!saved) return { ...defaultProfile }

    return {
      ...defaultProfile,
      ...JSON.parse(saved),
    }
  } catch {
    return { ...defaultProfile }
  }
}

export function saveAccountProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}
