import { supabase } from '../lib/supabase'

// Devuelve todas las filas de exposición a derivados del usuario autenticado (RLS),
// ordenadas por report_date descendente.
export const getDerivativesExposure = async () => {
    const { data, error } = await supabase
        .from('derivatives_exposure')
        .select('*')
        .order('report_date', { ascending: false })

    if (error) throw error
    return data ?? []
}

// Devuelve todas las filas cuyo report_date coincide con el más reciente
// (típicamente una o varias posiciones del mismo informe). null si no hay datos.
export const getLatestDerivativesExposure = async () => {
    // Primero localizamos el report_date más reciente
    const { data: latestRow, error: errLatest } = await supabase
        .from('derivatives_exposure')
        .select('report_date')
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (errLatest) throw errLatest
    if (!latestRow) return null

    const latestDate = latestRow.report_date

    const { data, error } = await supabase
        .from('derivatives_exposure')
        .select('*')
        .eq('report_date', latestDate)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? null
}

// Exposición bruta: suma del valor absoluto de market_value_eur del último report_date.
// Devuelve 0 si no hay filas.
export const getGrossExposure = async () => {
    const rows = await getLatestDerivativesExposure()
    if (!rows || rows.length === 0) return 0

    return rows.reduce((s, r) => s + Math.abs(Number(r.market_value_eur ?? 0)), 0)
}
