import { supabase } from '../lib/supabase'

export const getOperations = async () => {
    const { data, error } = await supabase
        .from('operations')
        .select('*')
        .order('date', { ascending: false })

    if (error) throw error
    return data
}

export const addOperation = async (operation) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
        .from('operations')
        .insert({ ...operation, user_id: user.id })
        .select()
        .single()

    if (error) throw error
    return data
}

export const deleteOperation = async (id) => {
    const { error } = await supabase
        .from('operations')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export const buildHoldingsFromOperations = (operations) => {
    const holdingsMap = {}

    operations.forEach(op => {
        if (!holdingsMap[op.ticker]) {
            holdingsMap[op.ticker] = {
                ticker: op.ticker,
                name: op.company_name,
                sector: op.sector,
                currency: op.currency,
                shares: 0,
            }
        }
        holdingsMap[op.ticker].shares += op.type === 'buy' ? Number(op.shares) : -Number(op.shares)
    })

    return Object.values(holdingsMap).filter(h => h.shares > 0)
}
