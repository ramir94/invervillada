const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Obtiene precios reales de mercado vía Supabase Edge Function (proxy de Yahoo Finance)
// tickers: string[] — lista de tickers del portfolio del usuario
export const getMarketData = async (tickers) => {
    if (!tickers || tickers.length === 0) return {}

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ tickers }),
        })

        if (!response.ok) {
            console.warn(`market-data error: HTTP ${response.status}`)
            return {}
        }

        const data = await response.json()

        if (data.error) {
            console.warn('market-data function error:', data.error)
            return {}
        }

        return data
    } catch (err) {
        console.error('Failed to fetch market data:', err)
        return {}
    }
}
