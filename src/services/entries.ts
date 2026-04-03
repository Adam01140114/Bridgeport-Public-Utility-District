import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { LogEntry } from '../types/entry'

const COLLECTION = 'logEntries'

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
    (snap) => {
      const list: LogEntry[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          locationId: data.locationId as string,
          locationName: data.locationName as string,
          entryDate: data.entryDate as string,
          submittedAt: data.submittedAt ?? null,
          values: (data.values as Record<string, string>) ?? {},
        }
      })
      onData(list)
    },
    (err) => onError?.(err as Error)
  )
}

export async function saveEntry(input: {
  locationId: string
  locationName: string
  entryDate: string
  values: Record<string, string>
}): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    locationId: input.locationId,
    locationName: input.locationName,
    entryDate: input.entryDate,
    values: input.values,
    submittedAt: serverTimestamp(),
  })
}
