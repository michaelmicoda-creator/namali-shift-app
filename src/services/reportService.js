import { fmtDateIT, fmtTimeIT, durationMinutes, fmtDuration } from '../lib/dateUtils.js'

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export const reportService = {
  exportCSV(rows, filename) {
    const headers = ['Data', 'Dipendente', 'Entrata', 'Uscita', 'Durata', 'Stato', 'Postazione']
    const lines = rows.map(row => {
      const duration = row.clock_in && row.clock_out
        ? fmtDuration(durationMinutes(row.clock_in, row.clock_out))
        : '-'

      return [
        fmtDateIT(row.clock_in),
        row.profiles?.full_name || '',
        fmtTimeIT(row.clock_in),
        row.clock_out ? fmtTimeIT(row.clock_out) : '-',
        duration,
        row.status,
        row.clock_in_station?.code || ''
      ].map(csvCell).join(',')
    })

    const csv = '\uFEFF' + [headers.map(csvCell).join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}
