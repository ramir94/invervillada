import { supabase } from '../lib/supabase'
import { toEur } from '../utils/fx'

// Devuelve todas las filas de ingresos del usuario autenticado (RLS aplica),
// ordenadas por payment_date descendente. Si no hay filas devuelve [].
export const getIncomes = async () => {
    const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .order('payment_date', { ascending: false })

    if (error) throw error
    return data ?? []
}

// Construye el rango [fromDate, toDate] por defecto (últimos 30 días) cuando
// el llamador no pasa fechas. Se aceptan strings 'YYYY-MM-DD' o Date.
const normalizeDateRange = (fromDate, toDate) => {
    const to = toDate ? new Date(toDate) : new Date()
    const from = fromDate ? new Date(fromDate) : (() => {
        const d = new Date(to)
        d.setDate(d.getDate() - 30)
        return d
    })()

    return {
        fromIso: from.toISOString().split('T')[0],
        toIso: to.toISOString().split('T')[0],
    }
}

// Resumen agregado de ingresos en el rango indicado, convertido a EUR.
// Devuelve:
//   {
//     totalGross, totalWithholding, totalNet,
//     byType: { coupon, dividend, interest, amortization, other },
//     fromIso, toIso,
//   }
// Todos los valores en EUR (aplicando la tabla FX centralizada).
export const getIncomesSummary = async (fromDate, toDate) => {
    const { fromIso, toIso } = normalizeDateRange(fromDate, toDate)

    const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .gte('payment_date', fromIso)
        .lte('payment_date', toIso)

    if (error) throw error

    const summary = {
        totalGross: 0,
        totalWithholding: 0,
        totalNet: 0,
        byType: {
            coupon: 0,
            dividend: 0,
            interest: 0,
            amortization: 0,
            other: 0,
        },
        fromIso,
        toIso,
    }

    if (!data || data.length === 0) return summary

    data.forEach(row => {
        const ccy = row.currency ?? 'EUR'
        const gross = toEur(Number(row.gross_amount ?? 0), ccy)
        const withholding = toEur(Number(row.withholding_tax ?? 0), ccy)
        const net = toEur(Number(row.net_amount ?? 0), ccy)

        summary.totalGross += gross
        summary.totalWithholding += withholding
        summary.totalNet += net

        const type = row.income_type ?? 'other'
        if (summary.byType[type] == null) summary.byType[type] = 0
        summary.byType[type] += gross
    })

    return summary
}

// Inserta una fila en incomes y devuelve la fila creada.
// El user_id se toma de la sesión activa (RLS hará la comprobación final).
export const addIncome = async (payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión activa')

    const { data, error } = await supabase
        .from('incomes')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()

    if (error) throw error
    return data
}
