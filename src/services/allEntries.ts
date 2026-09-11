import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { LogEntry } from '../types/entry'
import { docToLogEntry, LOG_ENTRIES_COLLECTION } from './logEntryDoc'

export function subscribeAllEntries(
  onData: (entries: LogEntry[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, LOG_ENTRIES_COLLECTION), orderBy('submittedAt', 'desc'))

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(docToLogEntry)),
    (err) => onError?.(err as Error)
  )
}
