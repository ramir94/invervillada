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

// Detecta bonos vencidos y genera automáticamente las operaciones de venta + ingreso en efectivo
export const redeemMaturedBonds = async (operations) => {
    const today = new Date().toISOString().split('T')[0]
    const holdings = buildHoldingsFromOperations(operations)
    // Solo auto-redimir bonos que cotizan cerca del par (≥ 95%).
    // Bonos "distressed" (precio muy por debajo) no se redimen al 100% aunque la fecha técnica haya pasado
    // y requieren tratamiento manual (ej. restructuración, call prorrogado, default).
    const maturedBonds = holdings.filter(h =>
        h.asset_type === 'bond'
        && h.maturity_date
        && h.maturity_date <= today
        && h.shares > 0
        && (h.market_price == null || h.market_price >= 95)
    )

    if (maturedBonds.length === 0) return []

    const { data: { user } } = await supabase.auth.getUser()
    const newOps = []

    for (const bond of maturedBonds) {
        const currency = bond.currency || 'EUR'
        const maturityDate = bond.maturity_date

        // 1) Venta del bono al 100% (par) en fecha de vencimiento
        const sellOp = {
            ticker: bond.ticker,
            company_name: bond.name,
            sector: bond.sector,
            asset_type: 'bond',
            type: 'sell',
            shares: bond.shares,
            price: 100,
            currency,
            date: maturityDate,
            isin: bond.isin,
            maturity_date: bond.maturity_date,
            coupon_rate: bond.coupon_rate,
            rating: bond.rating,
            duration: null,
            ytm_at_purchase: null,
            user_id: user.id,
        }

        // 2) Ingreso del nominal en efectivo
        const cashOp = {
            ticker: `CASH_${currency}`,
            company_name: `Liquidez ${currency}`,
            sector: 'Cash',
            asset_type: 'cash',
            type: 'buy',
            shares: bond.shares, // nominal = importe que se recupera al par
            price: 1.0,
            currency,
            date: maturityDate,
            user_id: user.id,
        }

        const { data, error } = await supabase
            .from('operations')
            .insert([sellOp, cashOp])
            .select()

        if (error) {
            console.warn(`redeemMaturedBonds failed for ${bond.ticker}:`, error.message)
            continue
        }
        newOps.push(...data)
    }

    return newOps
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
                country: op.country ?? null,
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

    // Accruals (deudores/acreedores) pueden tener saldo negativo → se conservan igualmente;
    // el resto sólo si sigue habiendo posición viva.
    return Object.values(holdingsMap).filter(h => h.asset_type === 'accrual' || h.shares > 0)
}
