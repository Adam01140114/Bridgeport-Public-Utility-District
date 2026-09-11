import type { Timestamp } from 'firebase/firestore'

export interface LogEntry {
  id: string
  locationId: string
  locationName: string
  /** Form date (YYYY-MM-DD) for sorting/filtering with the paper log */
  entryDate: string
  /** Operator name / initials typed on the form (empty for entries saved before this field existed). */
  operator: string
  /** Server timestamp set when the entry was submitted: the automatic work-log timestamp. */
  submittedAt: Timestamp | null
  values: Record<string, string>
}
