import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { LogEntry } from '../types/entry'
import { docToLogEntry, LOG_ENTRIES_COLLECTION } from './logEntryDoc'

const COLLECTION = LOG_ENTRIES_COLLECTION

export async function fetchEntriesForLocation(locationId: string): Promise<LogEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    where('locationId', '==', locationId),
    orderBy('submittedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToLogEntry)
}

export function subscribeEntriesForLocation(
  locationId: string,
  onData: (entries: LogEntry[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('locationId', '==', locationId),
    orderBy('submittedAt', 'desc')
  )

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(docToLogEntry)),
    (err) => onError?.(err as Error)
  )
}

export async function saveEntry(input: {
  locationId: string
  locationName: string
  entryDate: string
  operator: string
  values: Record<string, string>
}): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    locationId: input.locationId,
    locationName: input.locationName,
    entryDate: input.entryDate,
    operator: input.operator.trim(),
    values: input.values,
    // Written by the Firestore server at submission time: this is the work-log timestamp.
    submittedAt: serverTimestamp(),
  })
}

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, entryId))
}
