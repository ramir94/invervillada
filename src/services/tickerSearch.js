const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Busca tickers en Yahoo Finance vía Edge Function (acciones, ETFs, fondos)
export const searchTickers = async (query) => {
    if (!query || query.length < 1) return []

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ticker-search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ query }),
        })

        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data) ? data : []
    } catch {
        return []
    }
}
