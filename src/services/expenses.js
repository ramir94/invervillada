import { supabase } from '../lib/supabase'
import { toEur } from '../utils/fx'

// Devuelve todas las filas de gastos del fondo del usuario autenticado (RLS aplica),
// ordenadas por expense_date descendente.
export const getFundExpenses = async () => {
    const { data, error } = await supabase
        .from('fund_expenses')
        .select('*')
        .order('expense_date', { ascending: false })

    if (error) throw error
    return data ?? []
}

// Default: últimos 30 días
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

// Resumen agregado de gastos en el rango indicado, convertido a EUR.
// Devuelve:
//   {
//     totalInEur,
//     byType: { management_fee, depository_fee, fx_expense, running_cost, other },
//     fromIso, toIso,
//   }
export const getExpensesSummary = async (fromDate, toDate) => {
    const { fromIso, toIso } = normalizeDateRange(fromDate, toDate)

    const { data, error } = await supabase
        .from('fund_expenses')
        .select('*')
        .gte('expense_date', fromIso)
        .lte('expense_date', toIso)

    if (error) throw error

    const summary = {
        totalInEur: 0,
        byType: {
            management_fee: 0,
            depository_fee: 0,
            fx_expense: 0,
            running_cost: 0,
            other: 0,
        },
        fromIso,
        toIso,
    }

    if (!data || data.length === 0) return summary

    data.forEach(row => {
        const ccy = row.currency ?? 'EUR'
        const amountEur = toEur(Number(row.amount ?? 0), ccy)

        summary.totalInEur += amountEur

        const type = row.expense_type ?? 'other'
        if (summary.byType[type] == null) summary.byType[type] = 0
        summary.byType[type] += amountEur
    })

    return summary
}

// Inserta una fila en fund_expenses y devuelve la fila creada.
export const addFundExpense = async (payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión activa')

    const { data, error } = await supabase
        .from('fund_expenses')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()

    if (error) throw error
    return data
}
