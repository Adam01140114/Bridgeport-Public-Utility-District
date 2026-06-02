export type MonthWeekSlice = {
  weekNumber: number
  start: Date
  end: Date
}

/** At most four weeks per month: 1–7, 8–14, 15–21, then 22–last (remaining days roll into week 4). */
export function weekSlicesInMonth(monthKey: string): MonthWeekSlice[] {
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return []
  const lastDay = new Date(y, mo, 0).getDate()
  const slices: MonthWeekSlice[] = []

  const pushSlice = (weekNumber: number, startDay: number, endDay: number) => {
    slices.push({
      weekNumber,
      start: new Date(y, mo - 1, startDay),
      end: new Date(y, mo - 1, endDay),
    })
  }

  for (let w = 0; w < 3; w++) {
    const startDay = w * 7 + 1
    if (startDay > lastDay) return slices
    const endDay = Math.min(startDay + 6, lastDay)
    pushSlice(w + 1, startDay, endDay)
  }

  const week4Start = 22
  if (week4Start > lastDay) return slices
  pushSlice(4, week4Start, lastDay)
  return slices
}

export function weekStorageKey(monthKey: string, weekIndex: number): string {
  return `${monthKey}|w${weekIndex}`
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
