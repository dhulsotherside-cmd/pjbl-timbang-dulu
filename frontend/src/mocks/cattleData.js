
const initialCattle = [  { id: '1001', tag: 'TAG-001', breed: 'Simental', gender: 'Jantan', ageMonths: 24, status: 'active' },
  { id: '1002', tag: 'TAG-002', breed: 'Limousin', gender: 'Betina', ageMonths: 20, status: 'active' },
  { id: '1003', tag: 'TAG-003', breed: 'PO', gender: 'Jantan', ageMonths: 18, status: 'active' },
  { id: '1004', tag: 'TAG-004', breed: 'Brahman', gender: 'Betina', ageMonths: 22, status: 'active' },
  { id: '1005', tag: 'TAG-005', breed: 'Simental', gender: 'Jantan', ageMonths: 26, status: 'active' },
  { id: '1006', tag: 'TAG-006', breed: 'Limousin', gender: 'Betina', ageMonths: 19, status: 'active' },
  { id: '1007', tag: 'TAG-007', breed: 'PO', gender: 'Jantan', ageMonths: 16, status: 'active' },
  { id: '1008', tag: 'TAG-008', breed: 'Brahman', gender: 'Betina', ageMonths: 21, status: 'active' },
  { id: '1009', tag: 'TAG-009', breed: 'Simental', gender: 'Jantan', ageMonths: 28, status: 'active' },
  { id: '1010', tag: 'TAG-010', breed: 'Limousin', gender: 'Betina', ageMonths: 23, status: 'active' },
  { id: '1011', tag: 'TAG-011', breed: 'PO', gender: 'Jantan', ageMonths: 17, status: 'active' },
  { id: '1012', tag: 'TAG-012', breed: 'Brahman', gender: 'Betina', ageMonths: 25, status: 'active' },
  { id: '1013', tag: 'TAG-013', breed: 'Simental', gender: 'Jantan', ageMonths: 30, status: 'active' },
  { id: '1014', tag: 'TAG-014', breed: 'Limousin', gender: 'Betina', ageMonths: 18, status: 'active' },
  { id: '1015', tag: 'TAG-015', breed: 'PO', gender: 'Jantan', ageMonths: 20, status: 'active' },
  { id: '1016', tag: 'TAG-016', breed: 'Brahman', gender: 'Betina', ageMonths: 24, status: 'active' },
  { id: '1017', tag: 'TAG-017', breed: 'Simental', gender: 'Jantan', ageMonths: 27, status: 'active' },
  { id: '1018', tag: 'TAG-018', breed: 'Limousin', gender: 'Betina', ageMonths: 22, status: 'active' },
  { id: '1019', tag: 'TAG-019', breed: 'PO', gender: 'Jantan', ageMonths: 19, status: 'active' },
  { id: '1020', tag: 'TAG-020', breed: 'Brahman', gender: 'Betina', ageMonths: 26, status: 'active' },
  { id: '1021', tag: 'TAG-021', breed: 'Simental', gender: 'Jantan', ageMonths: 21, status: 'active' },
  { id: '1022', tag: 'TAG-022', breed: 'Limousin', gender: 'Betina', ageMonths: 17, status: 'active' },
  { id: '1023', tag: 'TAG-023', breed: 'PO', gender: 'Jantan', ageMonths: 23, status: 'active' },
  { id: '1024', tag: 'TAG-024', breed: 'Brahman', gender: 'Betina', ageMonths: 20, status: 'active' },

  { id: '1025', tag: 'TAG-025', breed: 'Simental', gender: 'Jantan', ageMonths: 29, status: 'archived' },
  { id: '1026', tag: 'TAG-026', breed: 'Limousin', gender: 'Betina', ageMonths: 25, status: 'archived' },
  { id: '1027', tag: 'TAG-027', breed: 'PO', gender: 'Jantan', ageMonths: 31, status: 'archived' },
  { id: '1028', tag: 'TAG-028', breed: 'Brahman', gender: 'Betina', ageMonths: 27, status: 'archived' },
]
const STORAGE_KEY = 'timbangdulu_cattle'
const MEASUREMENT_STORAGE_KEY = 'timbangdulu_measurements'

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

let cattle = loadFromStorage(STORAGE_KEY, initialCattle)

function saveCattle() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cattle))
}

const initialMeasurements = Array.from({ length: 86 }, (_, index) => {  const cattleIndex = index % cattle.length
  const cow = cattle[cattleIndex]

  const monthOffset = Math.floor(index / 22)
  const day = (index % 22) + 1
  const date = new Date(2026, 7 + monthOffset, day)

  const baseWeight = 230 + cattleIndex * 7
  const growth = Math.floor(index / cattle.length) * 9
  const variation = (cattleIndex % 4) * 3

  return {
    id: `MEAS-${String(index + 1).padStart(3, '0')}`,
    cattleId: cow.id,
    date: date.toISOString().slice(0, 10),
    weight: baseWeight + growth + variation,
  }
})

let measurements = loadFromStorage(
  MEASUREMENT_STORAGE_KEY,
  initialMeasurements
)

function saveMeasurements() {
  localStorage.setItem(
    MEASUREMENT_STORAGE_KEY,
    JSON.stringify(measurements)
  )
}
export function getAllCattle() {
  return cattle
}

export function getActiveCattle() {
  return cattle.filter((cow) => cow.status === 'active')
}

export function getArchivedCattle() {
  return cattle.filter((cow) => cow.status === 'archived')
}

export function getAllMeasurements() {
  return measurements
}

export function getCattleMeasurements(cattleId) {
  return measurements
    .filter((measurement) => measurement.cattleId === cattleId)
    .sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
)
}

export function getLatestMeasurement(cattleId) {
  const history = getCattleMeasurements(cattleId)
  return history.length ? history[history.length - 1] : null
}

export function getCattleWithLatestWeight() {
  return cattle.map((cow) => {
    const latest = getLatestMeasurement(cow.id)

    return {
      ...cow,
      latestWeight: latest?.weight ?? null,
      lastMeasuredAt: latest?.date ?? null,
    }
  })
}

export function getDashboardStats() {
  const active = getActiveCattle()
  const archived = getArchivedCattle()

  const latestWeights = active
    .map((cow) => getLatestMeasurement(cow.id)?.weight)
    .filter((weight) => Number.isFinite(Number(weight)))
    .map(Number)

  const averageWeight = latestWeights.length
    ? Math.round(
        latestWeights.reduce((total, weight) => total + weight, 0) /
        latestWeights.length
      )
    : 0

  return {
    activeCattle: active.length,
    archivedCattle: archived.length,
    totalMeasurements: measurements.length,
    averageWeight,
  }
}


export function updateCattleProfile(cattleId, updates) {
  const cow = cattle.find((item) => item.id === cattleId)

  if (!cow) return null

  const allowedFields = ['breed', 'gender', 'ageMonths']

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      cow[field] = updates[field]
    }
  })
  saveCattle()
  return cow
}

export function archiveCattle(cattleId) {
  const cow = cattle.find((item) => item.id === cattleId)

  if (!cow || cow.status === 'archived') {
    return null
  }

  cow.status = 'archived'
  cow.archivedAt = new Date().toISOString().split('T')[0]
  saveCattle()
  return cow
}


export function addCattle(newCow) {
  const idExists = cattle.some(
    (cow) => cow.id === String(newCow.id)
  )

  if (idExists) {
    return {
      success: false,
      message: 'ID Sapi sudah pernah digunakan.',
    }
  }

  const tagExists = cattle.some(
    (cow) =>
      cow.tag.toLowerCase() === newCow.tag.trim().toLowerCase() &&
      cow.status === 'active'
  )

  if (tagExists) {
    return {
      success: false,
      message: 'Ear tag sedang digunakan oleh sapi aktif lainnya.',
    }
  }

  const cow = {
    id: String(newCow.id),
    tag: newCow.tag.trim(),
    breed: newCow.breed,
    gender: newCow.gender,
    ageMonths: Number(newCow.ageMonths),
    status: 'active',
  }

  cattle.push(cow)
  saveCattle()

  return {
    success: true,
    data: cow,
  }
}

export function addMeasurement(cattleId, weight) {
  const cowExists = cattle.some(
    (cow) =>
      cow.id === String(cattleId) &&
      cow.status === 'active'
  )

  if (!cowExists) {
    return {
      success: false,
      message: 'Data sapi tidak ditemukan atau sudah diarsipkan.',
    }
  }

  if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
    return {
      success: false,
      message: 'Bobot pengukuran tidak valid.',
    }
  }

  const nextNumber = measurements.reduce((max, item) => {
    const number = Number(item.id.replace('MEAS-', ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0) + 1

  const newMeasurement = {
    id: `MEAS-${String(nextNumber).padStart(3, '0')}`,
    cattleId: String(cattleId),
    date: new Date().toISOString(),
    weight: Number(weight),
  }

  measurements.push(newMeasurement)
  saveMeasurements()

  return {
    success: true,
    data: newMeasurement,
  }
}


export function generateNextCattleId() {
  const highestId = cattle.reduce(
    (highest, cow) => Math.max(highest, Number(cow.id)),
    1000
  )

  return String(highestId + 1)
}
