import type { Gender, Speaker } from '../types/db'
import type { SpeakerInput } from '../data/speakers'

// xlsx is large (~600 kB). Load it on demand so it stays out of the main bundle
// and off the display windows, which never import/export.
const loadXLSX = () => import('xlsx')

const VALID_GENDERS: Gender[] = ['man', 'woman', 'enby']

export type ParseResult = {
  rows: SpeakerInput[]
  errors: string[]
}

/**
 * Parse an uploaded CSV/XLSX file into speaker inputs.
 * Expects columns "name" and "gender" (header row, case-insensitive).
 * Gender must be one of: man, woman, enby.
 */
export async function parseSpeakerFile(file: File): Promise<ParseResult> {
  const XLSX = await loadXLSX()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  const rows: SpeakerInput[] = []
  const errors: string[] = []

  raw.forEach((record, index) => {
    // Normalise header keys to lowercase/trimmed so "Name", "GENDER" etc. work.
    const normalised: Record<string, string> = {}
    for (const [key, value] of Object.entries(record)) {
      normalised[key.trim().toLowerCase()] = String(value).trim()
    }

    const name = normalised['name']
    const gender = normalised['gender']?.toLowerCase()
    const line = index + 2 // +1 for header, +1 for 1-based

    if (!name) {
      errors.push(`Row ${line}: missing name`)
      return
    }
    if (!VALID_GENDERS.includes(gender as Gender)) {
      errors.push(
        `Row ${line}: invalid gender "${normalised['gender']}" (use man, woman or enby)`,
      )
      return
    }

    rows.push({ name, gender: gender as Gender })
  })

  return { rows, errors }
}

/** Download the register as an .xlsx file. */
export async function downloadSpeakers(speakers: Speaker[]) {
  const XLSX = await loadXLSX()
  const data = speakers.map((s) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    created_at: s.created_at,
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Register')
  XLSX.writeFile(workbook, 'talktamer-register.xlsx')
}
