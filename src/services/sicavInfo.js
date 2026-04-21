import { supabase } from '../lib/supabase'

// Devuelve la fila más reciente de sicav_info para el usuario autenticado (por RLS),
// ordenada por report_date descendente. Devuelve null si no hay filas.
export const getLatestSicavInfo = async () => {
    const { data, error } = await supabase
        .from('sicav_info')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data ?? null
}

// Inserta o actualiza una fila de sicav_info (upsert por user_id + report_date).
// Requiere sesión activa — el user_id se toma de auth.getUser().
export const upsertSicavInfo = async (info) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión activa')

    const { data, error } = await supabase
        .from('sicav_info')
        .upsert(
            { ...info, user_id: user.id },
            { onConflict: 'user_id,report_date' }
        )
        .select()
        .single()

    if (error) throw error
    return data
}
