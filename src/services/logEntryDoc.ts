import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import type { LogEntry } from '../types/entry'

export const LOG_ENTRIES_COLLECTION = 'logEntries'

/** Single place that turns a Firestore `logEntries` document into a `LogEntry`. */
export function docToLogEntry(d: QueryDocumentSnapshot<DocumentData>): LogEntry {
  const data = d.data()
  return {
    id: d.id,
    locationId: data.locationId as string,
    locationName: data.locationName as string,
    entryDate: (data.entryDate as string) ?? '',
    operator: typeof data.operator === 'string' ? data.operator : '',
    submittedAt: data.submittedAt ?? null,
    values: (data.values as Record<string, string>) ?? {},
  }
}
