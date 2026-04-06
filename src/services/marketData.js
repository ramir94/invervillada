import { updateOperationMarketPrice } from './operations'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Detecta si un string tiene formato ISIN (2 letras + 10 alfanuméricos)
const isIsinFormat = (s) => /^[A-Z]{2}[A-Z0-9]{10}$/.test(s)

// Obtiene precios reales de mercado vía Supabase Edge Function (proxy de Yahoo Finance)
// tickerItems: string[] | { ticker, asset_type }[]
export const getMarketData = async (tickerItems) => {
    if (!tickerItems || tickerItems.length === 0) return {}

    // Normalizar a objetos { ticker, asset_type }
    const normalized = tickerItems.map(item =>
        typeof item === 'string'
            ? { ticker: item, asset_type: isIsinFormat(item) ? 'bond' : 'equity' }
            : item
    )

    const equityTickers = []
    const bondIsins = []

    normalized.forEach(({ ticker, asset_type }) => {
        if (asset_type === 'cash') return  // cash no necesita API
        if (asset_type === 'bond') {
            bondIsins.push(ticker)
        } else {
            // equity, bond_etf, SICAV, etc. → Yahoo Finance normal
            equityTickers.push(ticker)
        }
    })

    const result = {}

    // Cash: precio siempre 1.0
    normalized
        .filter(({ asset_type }) => asset_type === 'cash')
        .forEach(({ ticker }) => {
            result[ticker] = { price: 1.0, changeAmount: 0, changePercent: 0, yield: 0 }
        })

    // Equity + bond_etf: Edge Function normal
    if (equityTickers.length > 0) {
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ tickers: equityTickers }),
            })

            if (response.ok) {
                const data = await response.json()
                if (!data.error) Object.assign(result, data)
            } else {
                console.warn(`market-data equity error: HTTP ${response.status}`)
            }
        } catch (err) {
            console.error('Failed to fetch equity market data:', err)
        }
    }

    // Bonos individuales (ISIN): intentar Yahoo Finance con ISIN como ticker
    // Yahoo Finance responde a algunos ISINs europeos directamente
    if (bondIsins.length > 0) {
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ tickers: bondIsins }),
            })

            if (response.ok) {
                const data = await response.json()
                if (!data.error) {
                    for (const [isin, priceData] of Object.entries(data)) {
                        if (priceData && priceData.price && priceData.price > 0) {
                            result[isin] = priceData
                            // Persistir en DB como fallback offline (no bloquea el flujo)
                            updateOperationMarketPrice(isin, priceData.price).catch(() => {})
                        }
                    }
                }
            }
            // Si falla o no hay precio: analytics usará h.market_price de la DB (fallback)
        } catch (err) {
            console.warn('Bond ISIN price fetch failed (using DB fallback):', err)
        }
    }

    return result
}
