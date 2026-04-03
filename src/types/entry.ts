import type { Timestamp } from 'firebase/firestore'

export interface LogEntry {
  id: string
  locationId: string
  locationName: string
  /** Form date (YYYY-MM-DD) for sorting/filtering with the paper log */
  entryDate: string
  submittedAt: Timestamp | null
  values: Record<string, string>
}
