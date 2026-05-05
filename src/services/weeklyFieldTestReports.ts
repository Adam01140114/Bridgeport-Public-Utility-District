import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION = 'weeklyFieldTestReports'

/** Firestore document id for `weekStorageKey` (`YYYY-MM|wN`) — pipe replaced with underscore. */
export function weekStorageKeyToDocId(weekStorageKey: string): string {
  return weekStorageKey.replace('|', '_')
}

export function parseWeekStorageKey(
  weekStorageKey: string,
): { monthKey: string; weekIndex: number } | null {
  const m = weekStorageKey.match(/^(.+)\|w(\d+)$/)
  if (!m) return null
  return { monthKey: m[1], weekIndex: Number(m[2]) }
}

function weekReportDocRef(weekStorageKey: string) {
  return doc(db, COLLECTION, weekStorageKeyToDocId(weekStorageKey))
}

export async function fetchWeeklyFieldTestValues(
  weekStorageKey: string,
): Promise<Record<string, string> | null> {
  const snap = await getDoc(weekReportDocRef(weekStorageKey))
  if (!snap.exists()) return null
  const data = snap.data()
  const values = data.values
  if (!values || typeof values !== 'object') return null
  return values as Record<string, string>
}

export async function persistWeeklyFieldTestValues(input: {
  weekStorageKey: string
  values: Record<string, string>
}): Promise<void> {
  const parsed = parseWeekStorageKey(input.weekStorageKey)
  if (!parsed) {
    throw new Error(`Invalid week storage key: ${input.weekStorageKey}`)
  }
  await setDoc(
    weekReportDocRef(input.weekStorageKey),
    {
      monthKey: parsed.monthKey,
      weekIndex: parsed.weekIndex,
      weekStorageKey: input.weekStorageKey,
      values: input.values,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
