import { supabase } from '../lib/supabase'

// Guarda o actualiza el snapshot del día actual (upsert por user_id + fecha)
export const saveSnapshot = async (totalValue) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('portfolio_snapshots')
        .upsert(
            { user_id: user.id, snapshot_date: today, total_value: totalValue },
            { onConflict: 'user_id,snapshot_date' }
        )
        .select()
        .single()

    if (error) throw error
    return data
}

// Devuelve los últimos N snapshots ordenados del más reciente al más antiguo
export const getSnapshots = async (limit = 365) => {
    const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('snapshot_date, total_value')
        .order('snapshot_date', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data ?? []
}
