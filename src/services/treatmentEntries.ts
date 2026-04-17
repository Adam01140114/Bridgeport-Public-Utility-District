import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { TreatmentCategory, TreatmentLocation } from '../data/treatmentReport'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

const COLLECTION = 'treatmentReportEntries'

export function subscribeTreatmentEntriesForMonth(
  monthKey: string,
  onData: (entries: TreatmentReportEntry[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('monthKey', '==', monthKey),
    orderBy('entryDate', 'asc')
  )

  return onSnapshot(
    q,
    (snap) => {
      const list: TreatmentReportEntry[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          monthKey: data.monthKey as string,
          entryDate: data.entryDate as string,
          weekSlot: Number(data.weekSlot ?? 0),
          category: data.category as TreatmentCategory,
          location: data.location as TreatmentLocation,
          value: (data.value as string) ?? '',
          submittedAt: data.submittedAt ?? null,
        }
      })
      onData(list)
    },
    (err) => onError?.(err as Error)
  )
}

export async function saveTreatmentEntry(input: {
  monthKey: string
  entryDate: string
  weekSlot: number
  category: TreatmentCategory
  location: TreatmentLocation
  value: string
}): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    monthKey: input.monthKey,
    entryDate: input.entryDate,
    weekSlot: input.weekSlot,
    category: input.category,
    location: input.location,
    value: input.value,
    submittedAt: serverTimestamp(),
  })
}

export async function deleteTreatmentEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, entryId))
}

export async function updateTreatmentEntryValue(input: {
  entryId: string
  value: string
}): Promise<void> {
  await updateDoc(doc(db, COLLECTION, input.entryId), {
    value: input.value,
    submittedAt: serverTimestamp(),
  })
}

function docToEntry(d: QueryDocumentSnapshot<DocumentData>): TreatmentReportEntry {
  const data = d.data()
  return {
    id: d.id,
    monthKey: data.monthKey as string,
    entryDate: data.entryDate as string,
    weekSlot: Number(data.weekSlot ?? 0),
    category: data.category as TreatmentCategory,
    location: data.location as TreatmentLocation,
    value: (data.value as string) ?? '',
    submittedAt: data.submittedAt ?? null,
  }
}

export async function findTreatmentEntryConflict(input: {
  monthKey: string
  weekSlot: number
  category: TreatmentCategory
  location: TreatmentLocation
}): Promise<TreatmentReportEntry | null> {
  const q = query(
    collection(db, COLLECTION),
    where('monthKey', '==', input.monthKey),
    where('weekSlot', '==', input.weekSlot),
    where('category', '==', input.category),
    where('location', '==', input.location),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return docToEntry(snap.docs[0])
}

/** Same calendar day (entryDate) + category + location — used for FE Inches and other daily rows. */
export async function findTreatmentEntryConflictDaily(input: {
  monthKey: string
  entryDate: string
  category: TreatmentCategory
  location: TreatmentLocation
}): Promise<TreatmentReportEntry | null> {
  const q = query(
    collection(db, COLLECTION),
    where('monthKey', '==', input.monthKey),
    where('entryDate', '==', input.entryDate.trim()),
    where('category', '==', input.category),
    where('location', '==', input.location),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return docToEntry(snap.docs[0])
}
