// Tutte le date visualizzate e filtrate in Europe/Rome.
// Il database conserva TIMESTAMPTZ; il frontend converte sempre da/verso UTC.

const ROME = 'Europe/Rome'

function getZonedParts(date, timeZone = ROME) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  )
}

function zonedDateTimeToUtcIso(year, month, day, hour = 0, minute = 0, second = 0, timeZone = ROME) {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  let guess = targetAsUtc

  // Due/tre iterazioni gestiscono correttamente offset e ora legale.
  for (let i = 0; i < 3; i += 1) {
    const parts = getZonedParts(new Date(guess), timeZone)
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    )
    const adjustment = targetAsUtc - representedAsUtc
    guess += adjustment
    if (adjustment === 0) break
  }

  return new Date(guess).toISOString()
}

function parseLocalDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || '')
  if (!match) throw new Error('Data non valida')
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function addCalendarDays({ year, month, day }, amount) {
  const d = new Date(Date.UTC(year, month - 1, day + amount))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  }
}

export function fmtDateTimeIT(isoString) {
  if (!isoString) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString))
}

export function fmtDateIT(isoString) {
  if (!isoString) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    day: 'numeric',
    month: 'short'
  }).format(new Date(isoString))
}

export function fmtTimeIT(isoString) {
  if (!isoString) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString))
}

export function fmtFullDateIT(isoString) {
  if (!isoString) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(isoString))
}

export function fmtClockTime(date) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

export function fmtClockDate(date) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

export function getLocalDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function isSameRomeDay(isoString, localDateString = getLocalDateStr()) {
  if (!isoString) return false
  return getLocalDateStr(new Date(isoString)) === localDateString
}

export function isSameRomeMonth(isoString, localDateString = getLocalDateStr()) {
  if (!isoString) return false
  return getLocalDateStr(new Date(isoString)).slice(0, 7) === localDateString.slice(0, 7)
}

export function getMonthStartEnd(year, month) {
  const nextMonthDate = new Date(Date.UTC(year, month, 1))
  return {
    start: zonedDateTimeToUtcIso(year, month, 1),
    end: zonedDateTimeToUtcIso(
      nextMonthDate.getUTCFullYear(),
      nextMonthDate.getUTCMonth() + 1,
      1
    )
  }
}

export function getCurrentMonthYear() {
  const parts = getZonedParts(new Date())
  return { year: parts.year, month: parts.month }
}

export function getMonthName(month) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    month: 'long'
  }).format(new Date(Date.UTC(2026, month - 1, 15, 12)))
}

export function durationMinutes(startIso, endIso) {
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : new Date()
  return Math.max(0, Math.round((end - start) / 60000))
}

export function fmtDuration(minutes) {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0
  const h = Math.floor(safeMinutes / 60)
  const m = safeMinutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function getDateRangeFilter(startDateStr, endDateStr) {
  const result = {}

  if (startDateStr) {
    const start = parseLocalDate(startDateStr)
    result.start = zonedDateTimeToUtcIso(start.year, start.month, start.day)
  }

  if (endDateStr) {
    const end = addCalendarDays(parseLocalDate(endDateStr), 1)
    result.end = zonedDateTimeToUtcIso(end.year, end.month, end.day)
  }

  return result
}
