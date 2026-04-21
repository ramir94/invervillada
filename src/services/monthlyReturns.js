import { supabase } from '../lib/supabase'

// Lee los snapshots del usuario y calcula rentabilidad mes a mes (MoM) sobre los últimos
// 13 meses (12 meses completos + el mes en curso). Para cada mes toma el último snapshot
// disponible y compara con el último snapshot del mes previo:
//     MoM% = (end - start) / start * 100
//
// Si no hay suficientes snapshots históricos, se devuelven los puntos disponibles
// (no se rellena con datos ficticios). El consumidor puede mostrar un mensaje de
// histórico insuficiente cuando el array tiene menos de 2 elementos.
//
// Devuelve: Array<{ month: 'YYYY-MM', return_pct: number }>
export const getMonthlyReturns = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 14 meses hacia atrás (necesitamos el cierre del mes n-13 como "start" del mes n-12)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 14)
    const cutoffIso = cutoffDate.toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('snapshot_date, total_value')
        .gte('snapshot_date', cutoffIso)
        .order('snapshot_date', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return []

    // Último snapshot de cada mes (YYYY-MM)
    const lastPerMonth = new Map()
    data.forEach(s => {
        const month = s.snapshot_date.slice(0, 7)
        lastPerMonth.set(month, Number(s.total_value))
    })

    const months = Array.from(lastPerMonth.keys()).sort()
    if (months.length < 2) return []

    const series = []
    for (let i = 1; i < months.length; i++) {
        const start = lastPerMonth.get(months[i - 1])
        const end = lastPerMonth.get(months[i])
        if (start > 0) {
            series.push({
                month: months[i],
                return_pct: ((end - start) / start) * 100,
            })
        }
    }

    // Limitar a los últimos 13 puntos (12 meses + mes en curso)
    return series.slice(-13)
}
