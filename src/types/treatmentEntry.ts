import type { Timestamp } from 'firebase/firestore'
import type { TreatmentCategory, TreatmentLocation } from '../data/treatmentReport'

export interface TreatmentReportEntry {
  id: string
  monthKey: string
  entryDate: string
  weekSlot: number
  category: TreatmentCategory
  location: TreatmentLocation
  value: string
  submittedAt: Timestamp | null
}
