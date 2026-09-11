import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Month-level report data (notes, backwash override) lives in the same collection as the
 * weekly field-test documents. Firestore rules for this project are managed outside the repo
 * and only allow the existing collections, so a `<monthKey>_month` document keeps this working
 * without a rules deploy. Weekly docs use `<monthKey>_wN`, so ids never collide.
 */
const COLLECTION = 'weeklyFieldTestReports'

export type MonthlyReportMeta = {
  /** Free-text notes printed in the Notes box of the monthly Excel report. */
  notes: string
  /** Optional manual backwash count; blank means "use the total from the daily logs". */
  backwashesOverride: string
}

export const EMPTY_MONTHLY_REPORT_META: MonthlyReportMeta = { notes: '', backwashesOverride: '' }

function monthMetaDocRef(monthKey: string) {
  return doc(db, COLLECTION, `${monthKey}_month`)
}

export async function fetchMonthlyReportMeta(monthKey: string): Promise<MonthlyReportMeta> {
  const snap = await getDoc(monthMetaDocRef(monthKey))
  if (!snap.exists()) return { ...EMPTY_MONTHLY_REPORT_META }
  const data = snap.data()
  return {
    notes: typeof data.notes === 'string' ? data.notes : '',
    backwashesOverride:
      typeof data.backwashesOverride === 'string' ? data.backwashesOverride : '',
  }
}

export async function persistMonthlyReportMeta(
  monthKey: string,
  meta: MonthlyReportMeta,
): Promise<void> {
  await setDoc(
    monthMetaDocRef(monthKey),
    {
      kind: 'month',
      monthKey,
      notes: meta.notes,
      backwashesOverride: meta.backwashesOverride,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/** Effective count for the report: the manual override when it is a valid number, else the daily-log total. */
export function resolveBackwashCount(meta: MonthlyReportMeta, loggedCount: number): number {
  const t = meta.backwashesOverride.trim()
  if (t === '') return loggedCount
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return loggedCount
  return Math.round(n)
}
