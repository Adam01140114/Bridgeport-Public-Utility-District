import { collection, getDocs, limit, query, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'

const LOG_COLLECTION = 'logEntries'
const TREATMENT_COLLECTION = 'treatmentReportEntries'
const WEEKLY_FIELD_TEST_COLLECTION = 'weeklyFieldTestReports'
const BATCH_SIZE = 500

async function deleteAllDocumentsInCollection(collectionName: string): Promise<number> {
  const coll = collection(db, collectionName)
  let deleted = 0
  for (;;) {
    const snap = await getDocs(query(coll, limit(BATCH_SIZE)))
    if (snap.empty) break
    const batch = writeBatch(db)
    for (const d of snap.docs) {
      batch.delete(d.ref)
    }
    await batch.commit()
    deleted += snap.size
  }
  return deleted
}

export interface DeleteAllAppDataResult {
  logEntriesDeleted: number
  treatmentEntriesDeleted: number
  weeklyFieldTestReportsDeleted: number
}

/**
 * Permanently deletes every document in `logEntries`, `treatmentReportEntries`, and
 * `weeklyFieldTestReports`.
 * Requires Firestore rules to allow deletes (same as normal app usage).
 */
export async function deleteAllAppData(): Promise<DeleteAllAppDataResult> {
  const logEntriesDeleted = await deleteAllDocumentsInCollection(LOG_COLLECTION)
  const treatmentEntriesDeleted = await deleteAllDocumentsInCollection(TREATMENT_COLLECTION)
  const weeklyFieldTestReportsDeleted = await deleteAllDocumentsInCollection(
    WEEKLY_FIELD_TEST_COLLECTION,
  )
  return { logEntriesDeleted, treatmentEntriesDeleted, weeklyFieldTestReportsDeleted }
}
