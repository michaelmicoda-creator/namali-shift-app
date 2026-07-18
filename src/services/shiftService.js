import { supabase } from '../lib/supabase.js'
import { getMonthStartEnd, getDateRangeFilter } from '../lib/dateUtils.js'

export const shiftService = {
  async clockEvent(stationCode) {
    const { data, error } = await supabase.rpc('clock_in_out', {
      p_station_code: stationCode
    })
    if (error) throw error
    return data
  },

  async getMyShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, clock_in_station:clock_in_station_id(code, name), clock_out_station:clock_out_station_id(code, name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getCompanyShifts(filters = {}) {
    let query = supabase
      .from('shifts')
      .select('*, profiles!shifts_employee_id_fkey(full_name, position), clock_in_station:clock_in_station_id(code), clock_out_station:clock_out_station_id(code)')
      .order('created_at', { ascending: false })
    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)

    const range = getDateRangeFilter(filters.startDate, filters.endDate)
    if (range.start) query = query.gte('clock_in', range.start)
    if (range.end) query = query.lt('clock_in', range.end)

    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getActiveShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, profiles!shifts_employee_id_fkey(full_name, position)')
      .eq('status', 'active')
    if (error) throw error
    return data
  },

  async getClockEvents() {
    const { data, error } = await supabase
      .from('clock_events')
      .select('*, profiles!clock_events_employee_id_fkey(full_name), stations(code, name)')
      .order('occurred_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },

  async getMonthlyReport(year, month) {
    const { start, end } = getMonthStartEnd(year, month)
    const { data, error } = await supabase
      .from('shifts')
      .select('*, profiles!shifts_employee_id_fkey(full_name)')
      .gte('clock_in', start)
      .lt('clock_in', end)
      .eq('status', 'completed')
    if (error) throw error
    return data
  }
}
