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

// Persiste el último precio de mercado conocido para un ticker (usado como fallback offline)
export const updateOperationMarketPrice = async (ticker, marketPrice) => {
    const { error } = await supabase
        .from('operations')
        .update({ market_price: marketPrice })
        .eq('ticker', ticker)

    if (error) console.warn('updateOperationMarketPrice failed:', error.message)
}

export const buildHoldingsFromOperations = (operations) => {
    const holdingsMap = {}

    operations.forEach(op => {
        const assetType = op.asset_type ?? 'equity'
        const key = op.ticker

        if (!holdingsMap[key]) {
            holdingsMap[key] = {
                ticker: op.ticker,
                name: op.company_name,
                sector: op.sector,
                currency: op.currency,
                shares: 0,
                asset_type: assetType,
                // Campos de renta fija (null para equity/cash)
                isin: op.isin ?? null,
                maturity_date: op.maturity_date ?? null,
                coupon_rate: op.coupon_rate ? Number(op.coupon_rate) : null,
                rating: op.rating ?? null,
                duration: op.duration ? Number(op.duration) : null,
                ytm_at_purchase: op.ytm_at_purchase ? Number(op.ytm_at_purchase) : null,
                market_price: op.market_price ? Number(op.market_price) : null,
            }
        }

        holdingsMap[key].shares += op.type === 'buy' ? Number(op.shares) : -Number(op.shares)

        // Actualizar market_price con el valor más reciente de la DB
        if (op.market_price != null) {
            holdingsMap[key].market_price = Number(op.market_price)
        }
    })

    return Object.values(holdingsMap).filter(h => h.shares > 0)
}
