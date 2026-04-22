import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { PlusCircle, Trash2, TrendingUp, TrendingDown, Search, AlertTriangle, ArrowRight, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, X, Loader2, Landmark, DollarSign, BarChart2 } from 'lucide-react'

const PAGE_SIZE = 10
import { addOperation, deleteOperation } from '../../services/operations'
import { searchStocks } from '../../data/stockCatalog'
import { searchTickers } from '../../services/tickerSearch'
import { formatCurrency } from '../../utils/formatting'

const emptyForm = {
    ticker: '',
    company_name: '',
    sector: '',
    type: 'buy',
    shares: '',
    price: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    // Campos de renta fija
    isin: '',
    maturity_date: '',
    coupon_rate: '',
    rating: '',
    duration: '',
    ytm_at_purchase: '',
}

const ASSET_TYPES = [
    { id: 'equity', label: 'Renta Variable', icon: TrendingUp, color: 'var(--success)' },
    { id: 'bond', label: 'Bono (RF)', icon: Landmark, color: '#818cf8' },
    { id: 'bond_etf', label: 'ETF Renta Fija', icon: BarChart2, color: '#38bdf8' },
    { id: 'cash', label: 'Liquidez', icon: DollarSign, color: '#eab308' },
]

// Calcula el impacto hipotético de una operación sobre el portfolio actual
const computeOperationImpact = (analytics, form, isFormReady, assetType = 'equity') => {
    if (!analytics || !isFormReady || !form.shares || !form.price) return null
    const shares = Number(form.shares)
    const price = Number(form.price)
    if (!shares || !price) return null

    // Para bonos el valor = nominal × precio_pct / 100; para cash = importe directo
    const opValue = assetType === 'bond'
        ? shares * price / 100
        : assetType === 'cash'
            ? shares
            : shares * price

    if (form.type === 'buy') {
        const newTotal = analytics.totalValue + opValue
        const existingPos = analytics.positions.find(p => p.ticker === form.ticker)
        const existingValue = existingPos ? existingPos.value : 0
        const newPositionValue = existingValue + opValue
        const newWeight = newTotal > 0 ? (newPositionValue / newTotal) * 100 : 0
        const currentWeight = existingPos ? existingPos.weight : 0

        // Top 3 hipotético
        const hypothetical = analytics.positions.map(p => ({
            ticker: p.ticker,
            value: p.ticker === form.ticker ? p.value + opValue : p.value,
        }))
        if (!existingPos) hypothetical.push({ ticker: form.ticker, value: opValue })
        const hypTotal = hypothetical.reduce((s, p) => s + p.value, 0)
        const hypTop3 = hypothetical
            .map(p => (p.value / hypTotal) * 100)
            .sort((a, b) => b - a)
            .slice(0, 3)
            .reduce((s, w) => s + w, 0)

        return {
            type: 'buy',
            opValue,
            currentWeight,
            newWeight,
            currentTop3: analytics.top3Weight,
            newTop3: hypTop3,
            newTotal,
            isNewPosition: !existingPos,
            overweightAfter: newWeight > 15,
        }
    }

    if (form.type === 'sell') {
        const existingPos = analytics.positions.find(p => p.ticker === form.ticker)
        if (!existingPos) return null
        const sellValue = Math.min(opValue, existingPos.value)
        const newTotal = analytics.totalValue - sellValue
        const newPositionValue = Math.max(0, existingPos.value - sellValue)
        const newWeight = newTotal > 0 ? (newPositionValue / newTotal) * 100 : 0
        const realizedPnL = existingPos.avgCost > 0
            ? (price - existingPos.avgCost) * shares
            : 0

        return {
            type: 'sell',
            opValue: sellValue,
            currentWeight: existingPos.weight,
            newWeight,
            realizedPnL,
            newTotal,
        }
    }

    return null
}

export default function Operations({ operations, analytics, onOperationAdded, onOperationDeleted }) {
    const [assetType, setAssetType] = useState('equity')
    const [form, setForm] = useState(emptyForm)
    const [tickerQuery, setTickerQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [stockSelected, setStockSelected] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const suggestionsRef = useRef(null)

    // Estado de filtros, sorting y paginación de la tabla
    const [filterText, setFilterText] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [filterSector, setFilterSector] = useState('')
    const [sortCol, setSortCol] = useState('date')
    const [sortDir, setSortDir] = useState('desc')
    const [page, setPage] = useState(0)

    useEffect(() => {
        const handleClick = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setSuggestions([])
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const isFormReady = assetType === 'equity' || assetType === 'bond_etf'
        ? stockSelected
        : assetType === 'bond'
            ? !!form.isin
            : !!(form.shares && form.currency)  // cash

    const impact = useMemo(
        () => computeOperationImpact(analytics, form, isFormReady, assetType),
        [analytics, form, isFormReady, assetType]
    )

    const [searching, setSearching] = useState(false)
    const searchTimeoutRef = useRef(null)

    const handleTickerInput = useCallback((e) => {
        const val = e.target.value.toUpperCase()
        setTickerQuery(val)
        setStockSelected(false)
        setForm(prev => ({ ...prev, ticker: val, company_name: '', sector: '', currency: 'USD' }))

        // Primero: resultados inmediatos del catálogo local
        const localResults = val.length >= 1 ? searchStocks(val) : []
        setSuggestions(localResults.map(s => ({ ...s, source: 'catalog' })))

        // Luego: buscar en Yahoo Finance (debounced 400ms)
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
        if (val.length >= 2) {
            setSearching(true)
            searchTimeoutRef.current = setTimeout(async () => {
                const remoteResults = await searchTickers(val)
                // Merge: catálogo primero, luego Yahoo (sin duplicados)
                const localTickers = new Set(localResults.map(s => s.ticker))
                const merged = [
                    ...localResults.map(s => ({ ...s, source: 'catalog' })),
                    ...remoteResults
                        .filter(r => !localTickers.has(r.ticker))
                        .map(r => ({ ...r, source: 'yahoo' })),
                ]
                setSuggestions(merged)
                setSearching(false)
            }, 400)
        } else {
            setSearching(false)
        }
    }, [])

    const selectStock = (stock) => {
        setTickerQuery(stock.ticker)
        // Para ventas, usar la divisa de la posición existente (no la del catálogo)
        let currency = stock.currency || 'USD'
        if (form.type === 'sell' && analytics?.positions) {
            const pos = analytics.positions.find(p => p.ticker === stock.ticker)
            if (pos?.currency) currency = pos.currency
        }
        setForm(prev => ({
            ...prev,
            ticker: stock.ticker,
            company_name: stock.name,
            sector: stock.sector || '',
            currency,
        }))
        setStockSelected(true)
        setSuggestions([])
    }

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        let finalOp = { ...form, asset_type: assetType }

        if (assetType === 'equity' || assetType === 'bond_etf') {
            if (!stockSelected || !form.ticker) {
                setError('Selecciona un activo del desplegable.')
                return
            }
            if (!form.shares || !form.price) {
                setError('Introduce el número de acciones y el precio.')
                return
            }
            // Limpiar campos de renta fija que no aplican a equity/bond_etf
            finalOp = {
                ...finalOp,
                shares: Number(form.shares),
                price: Number(form.price),
                isin: null,
                maturity_date: null,
                coupon_rate: null,
                rating: null,
                duration: null,
                ytm_at_purchase: null,
            }

        } else if (assetType === 'bond') {
            if (!form.isin) { setError('El ISIN es obligatorio para bonos.'); return }
            if (!form.shares || !form.price) { setError('Introduce el nominal y el precio de adquisición.'); return }
            finalOp = {
                ...finalOp,
                ticker: form.isin.toUpperCase(),
                company_name: form.company_name || form.isin.toUpperCase(),
                shares: Number(form.shares),
                price: Number(form.price),
                isin: form.isin.toUpperCase(),
                coupon_rate: form.coupon_rate ? Number(form.coupon_rate) : null,
                duration: form.duration ? Number(form.duration) : null,
                ytm_at_purchase: form.ytm_at_purchase ? Number(form.ytm_at_purchase) : null,
                rating: form.rating || null,
                maturity_date: form.maturity_date || null,
                market_price: Number(form.price),  // precio adquisición como precio de mercado inicial
            }

        } else if (assetType === 'cash') {
            if (!form.shares || !form.currency) { setError('Introduce el importe y la divisa.'); return }
            const currency = form.currency || 'EUR'
            finalOp = {
                ...finalOp,
                ticker: `CASH_${currency}`,
                company_name: form.company_name || `Liquidez ${currency}`,
                sector: 'Cash',
                shares: Number(form.shares),
                price: 1.0,
                currency,
            }
        }

        setLoading(true)
        try {
            const op = await addOperation(finalOp)
            onOperationAdded(op)
            setForm(emptyForm)
            setTickerQuery('')
            setStockSelected(false)
            setShowForm(false)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteOperation(id)
            onOperationDeleted(id)
        } catch (err) {
            setError(err.message)
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setForm(emptyForm)
        setTickerQuery('')
        setStockSelected(false)
        setError(null)
        setSuggestions([])
        setAssetType('equity')
    }

    const handleAssetTypeChange = (type) => {
        setAssetType(type)
        setForm(emptyForm)
        setStockSelected(false)
        setTickerQuery('')
        setSuggestions([])
        setError(null)
    }

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2>Operaciones</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                        Registra compras y ventas para actualizar tu portfolio.
                    </p>
                </div>
                <button
                    className="btn"
                    onClick={() => setShowForm(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                >
                    <PlusCircle size={18} />
                    Nueva operación
                </button>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Registrar operación</h3>
                    <form onSubmit={handleSubmit}>

                        {/* Selector tipo de activo */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {ASSET_TYPES.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleAssetTypeChange(t.id)}
                                    style={{
                                        padding: '0.6rem 1rem',
                                        borderRadius: '8px',
                                        border: assetType === t.id ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                                        background: assetType === t.id ? `${t.color}1a` : 'transparent',
                                        color: assetType === t.id ? t.color : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <t.icon size={15} />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Buy / Sell toggle */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {['buy', 'sell'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setForm(p => {
                                        const updated = { ...p, type: t }
                                        // Al cambiar a venta, usar la divisa de la posición existente
                                        if (t === 'sell' && stockSelected && p.ticker && analytics?.positions) {
                                            const pos = analytics.positions.find(pos => pos.ticker === p.ticker)
                                            if (pos?.currency) updated.currency = pos.currency
                                        }
                                        return updated
                                    })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: form.type === t
                                            ? `1px solid ${t === 'buy' ? 'var(--success)' : 'var(--danger)'}`
                                            : '1px solid rgba(255,255,255,0.1)',
                                        background: form.type === t
                                            ? t === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
                                            : 'transparent',
                                        color: form.type === t
                                            ? t === 'buy' ? 'var(--success)' : 'var(--danger)'
                                            : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {t === 'buy' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                    {t === 'buy' ? 'Compra' : 'Venta'}
                                </button>
                            ))}
                        </div>

                        {/* ── Formulario: Liquidez ─────────────────────────────────────────── */}
                        {assetType === 'cash' && (
                            <div className="form-grid-2col" style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descripción</label>
                                    <input className="login-input" name="company_name" placeholder="Liquidez EUR" value={form.company_name} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Divisa *</label>
                                    <select className="login-input" name="currency" value={form.currency} onChange={handleChange} required style={{ background: '#1e293b', cursor: 'pointer' }}>
                                        {['EUR', 'USD', 'CHF', 'GBP', 'DKK', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Importe *</label>
                                    <input className="login-input" name="shares" type="number" min="0.01" step="any" placeholder="10000" value={form.shares} onChange={handleChange} required />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha *</label>
                                    <input className="login-input" name="date" type="date" value={form.date} onChange={handleChange} required />
                                </div>
                            </div>
                        )}

                        {/* ── Formulario: Bono individual ────────────────────────────────── */}
                        {assetType === 'bond' && (
                            <div className="form-grid-2col" style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ISIN *</label>
                                    <input className="login-input" name="isin" placeholder="XS2596599147" value={form.isin} onChange={e => setForm(p => ({ ...p, isin: e.target.value.toUpperCase() }))} required autoComplete="off" style={{ fontFamily: 'monospace' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nombre del bono</label>
                                    <input className="login-input" name="company_name" placeholder="PANDORA 4.5% 10/04/2028" value={form.company_name} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sector emisor</label>
                                    <input className="login-input" name="sector" placeholder="Consumer Discretionary" value={form.sector} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Divisa *</label>
                                    <select className="login-input" name="currency" value={form.currency} onChange={handleChange} required style={{ background: '#1e293b', cursor: 'pointer' }}>
                                        {['EUR', 'USD', 'CHF', 'GBP', 'DKK'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nominal (€) *</label>
                                    <input className="login-input" name="shares" type="number" min="0.01" step="any" placeholder="100000" value={form.shares} onChange={handleChange} required />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Precio adquisición (% nominal) *</label>
                                    <input className="login-input" name="price" type="number" min="0.001" step="any" placeholder="104.02" value={form.price} onChange={handleChange} required />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha operación *</label>
                                    <input className="login-input" name="date" type="date" value={form.date} onChange={handleChange} required />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha vencimiento</label>
                                    <input className="login-input" name="maturity_date" type="date" value={form.maturity_date} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cupón (%)</label>
                                    <input className="login-input" name="coupon_rate" type="number" min="0" step="any" placeholder="4.5" value={form.coupon_rate} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>TIR compra (%)</label>
                                    <input className="login-input" name="ytm_at_purchase" type="number" min="0" step="any" placeholder="3.037" value={form.ytm_at_purchase} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duración modificada (años)</label>
                                    <input className="login-input" name="duration" type="number" min="0" step="any" placeholder="1.895" value={form.duration} onChange={handleChange} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rating</label>
                                    <select className="login-input" name="rating" value={form.rating} onChange={handleChange} style={{ background: '#1e293b', cursor: 'pointer' }}>
                                        <option value="">Sin rating</option>
                                        {['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'NR'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* ── Formulario: Equity y ETF RF ───────────────────────────────── */}
                        {(assetType === 'equity' || assetType === 'bond_etf') && (
                        <div className="form-grid-2col">

                            {/* Ticker autocomplete */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative' }} ref={suggestionsRef}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Search size={13} /> Ticker *
                                </label>
                                <input
                                    className="login-input"
                                    placeholder="Escribe ticker o empresa..."
                                    value={tickerQuery}
                                    onChange={handleTickerInput}
                                    required
                                    autoComplete="off"
                                />
                                {(suggestions.length > 0 || searching) && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0, right: 0,
                                        marginTop: '4px',
                                        background: '#1e293b',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        zIndex: 100,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                        maxHeight: '320px',
                                        overflowY: 'auto',
                                    }}>
                                        {suggestions.map(s => (
                                            <div
                                                key={`${s.ticker}-${s.source ?? ''}`}
                                                onClick={() => selectStock(s)}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'background 0.15s',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--accent-color)', marginRight: '0.75rem' }}>{s.ticker}</span>
                                                    <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                    {s.type && s.type !== 'EQUITY' && (
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: '600',
                                                            background: 'rgba(129,140,248,0.15)',
                                                            color: '#818cf8',
                                                            padding: '0.1rem 0.35rem',
                                                            borderRadius: '4px',
                                                        }}>{s.type}</span>
                                                    )}
                                                    {s.exchange && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.exchange}</span>
                                                    )}
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        background: 'rgba(255,255,255,0.07)',
                                                        padding: '0.1rem 0.35rem',
                                                        borderRadius: '4px',
                                                        color: 'var(--text-secondary)'
                                                    }}>{s.currency}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {searching && (
                                            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                Buscando en mercados globales...
                                            </div>
                                        )}
                                        {!searching && suggestions.length === 0 && tickerQuery.length >= 2 && (
                                            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                No se encontraron resultados para "{tickerQuery}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Empresa (auto-filled) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Empresa</label>
                                <input
                                    className="login-input"
                                    value={form.company_name}
                                    readOnly
                                    placeholder="Se rellena al seleccionar"
                                    style={{ opacity: stockSelected ? 1 : 0.5, cursor: 'default' }}
                                />
                            </div>

                            {/* Sector (auto-filled) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sector</label>
                                <input
                                    className="login-input"
                                    value={form.sector}
                                    readOnly
                                    placeholder="Se rellena al seleccionar"
                                    style={{ opacity: stockSelected ? 1 : 0.5, cursor: 'default' }}
                                />
                            </div>

                            {/* Divisa (auto-filled) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Divisa</label>
                                <input
                                    className="login-input"
                                    value={form.currency}
                                    readOnly
                                    style={{ opacity: stockSelected ? 1 : 0.5, cursor: 'default' }}
                                />
                            </div>

                            {/* Acciones */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acciones *</label>
                                <input
                                    className="login-input"
                                    name="shares"
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    placeholder="100"
                                    value={form.shares}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Precio */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Precio por acción *</label>
                                <input
                                    className="login-input"
                                    name="price"
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    placeholder="150.00"
                                    value={form.price}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Fecha */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha *</label>
                                <input
                                    className="login-input"
                                    name="date"
                                    type="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Total estimado */}
                            {form.shares && form.price && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total operación</label>
                                    <div style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '8px',
                                        background: form.type === 'buy' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${form.type === 'buy' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                        fontWeight: '700',
                                        fontSize: '1.1rem',
                                        color: form.type === 'buy' ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        {form.type === 'buy' ? '+' : '-'}{formatCurrency(form.shares * form.price, form.currency)}
                                    </div>
                                </div>
                            )}
                        </div>
                        )}{/* fin equity/bond_etf form */}

                        {/* Valor estimado para bonos */}
                        {assetType === 'bond' && form.shares && form.price && (
                            <div style={{ marginTop: '0.5rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', fontWeight: '700', fontSize: '1.1rem', color: '#818cf8' }}>
                                Valor estimado: {formatCurrency(Number(form.shares) * Number(form.price) / 100, form.currency)}
                                <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({form.shares}€ nominal × {form.price}%)</span>
                            </div>
                        )}

                        {/* Preview de impacto en el portfolio */}
                        {impact && (
                            <div style={{
                                marginTop: '1.5rem',
                                background: 'rgba(56,189,248,0.06)',
                                border: '1px solid rgba(56,189,248,0.2)',
                                borderRadius: '10px',
                                padding: '1rem 1.25rem',
                            }}>
                                <div style={{ fontSize: '0.82rem', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '0.75rem' }}>
                                    Impacto en portfolio si confirmas esta operación:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                                    <ImpactRow
                                        label={`Peso ${form.ticker}`}
                                        before={`${impact.currentWeight.toFixed(1)}%`}
                                        after={`${impact.newWeight.toFixed(1)}%`}
                                        warn={impact.overweightAfter}
                                        warnMsg="Superará el 15% recomendado"
                                    />
                                    {impact.type === 'buy' && (
                                        <ImpactRow
                                            label="Concentración top 3"
                                            before={`${impact.currentTop3.toFixed(1)}%`}
                                            after={`${impact.newTop3.toFixed(1)}%`}
                                            warn={impact.newTop3 > 60}
                                            warnMsg="Top 3 superará el 60%"
                                        />
                                    )}
                                    {impact.type === 'sell' && impact.realizedPnL !== 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>P&L realizado</span>
                                            <span style={{
                                                fontSize: '0.95rem', fontWeight: '700',
                                                color: impact.realizedPnL >= 0 ? 'var(--success)' : 'var(--danger)',
                                            }}>
                                                {impact.realizedPnL >= 0 ? '+' : ''}{formatCurrency(impact.realizedPnL)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                marginTop: '1rem',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                color: 'var(--danger)',
                                fontSize: '0.9rem'
                            }}>{error}</div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn" disabled={loading || !isFormReady}>
                                {loading ? 'Guardando...' : 'Guardar operación'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista de operaciones */}
            {operations.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <PlusCircle size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p>No hay operaciones registradas. ¡Añade tu primera compra!</p>
                </div>
            ) : (
                <OperationsTable
                    operations={operations}
                    onDelete={handleDelete}
                    filterText={filterText} setFilterText={setFilterText}
                    filterType={filterType} setFilterType={setFilterType}
                    filterSector={filterSector} setFilterSector={setFilterSector}
                    sortCol={sortCol} setSortCol={setSortCol}
                    sortDir={sortDir} setSortDir={setSortDir}
                    page={page} setPage={setPage}
                />
            )}
        </div>
    )
}

function OperationsTable({
    operations, onDelete,
    filterText, setFilterText,
    filterType, setFilterType,
    filterSector, setFilterSector,
    sortCol, setSortCol,
    sortDir, setSortDir,
    page, setPage,
}) {
    // Sectores únicos para el select
    const sectors = useMemo(
        () => [...new Set(operations.map(op => op.sector).filter(Boolean))].sort(),
        [operations]
    )

    // Filtrado
    const filtered = useMemo(() => {
        const text = filterText.toLowerCase()
        return operations.filter(op => {
            if (filterType !== 'all' && op.type !== filterType) return false
            if (filterSector && op.sector !== filterSector) return false
            if (text && !op.ticker.toLowerCase().includes(text) && !op.company_name?.toLowerCase().includes(text)) return false
            return true
        })
    }, [operations, filterText, filterType, filterSector])

    // Sorting
    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let va, vb
            switch (sortCol) {
                case 'ticker': va = a.ticker; vb = b.ticker; break
                case 'empresa': va = a.company_name ?? ''; vb = b.company_name ?? ''; break
                case 'sector': va = a.sector ?? ''; vb = b.sector ?? ''; break
                case 'shares': va = Number(a.shares); vb = Number(b.shares); break
                case 'price': va = Number(a.price); vb = Number(b.price); break
                case 'total': va = Number(a.shares) * Number(a.price); vb = Number(b.shares) * Number(b.price); break
                case 'type': va = a.type; vb = b.type; break
                default: va = a.date; vb = b.date
            }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
            return sortDir === 'asc' ? va - vb : vb - va
        })
    }, [filtered, sortCol, sortDir])

    // Paginación
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages - 1)
    const paginated = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(col)
            setSortDir('desc')
        }
        setPage(0)
    }

    const resetFilters = () => {
        setFilterText('')
        setFilterType('all')
        setFilterSector('')
        setPage(0)
    }

    const hasActiveFilters = filterText || filterType !== 'all' || filterSector

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronDown size={12} style={{ opacity: 0.25 }} />
        return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--accent-color)' }} /> : <ChevronDown size={12} style={{ color: 'var(--accent-color)' }} />
    }

    const thStyle = (col, align = 'left') => ({
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        color: sortCol === col ? 'var(--accent-color)' : undefined,
        whiteSpace: 'nowrap',
    })

    return (
        <div>
            {/* Barra de filtros */}
            <div style={{
                display: 'flex', gap: '0.75rem', marginBottom: '1rem',
                flexWrap: 'wrap', alignItems: 'center',
            }}>
                {/* Búsqueda */}
                <div style={{ position: 'relative', flex: '1 1 180px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    <input
                        className="login-input"
                        placeholder="Buscar ticker o empresa..."
                        value={filterText}
                        onChange={e => { setFilterText(e.target.value); setPage(0) }}
                        style={{ paddingLeft: '2.2rem', height: '36px', fontSize: '0.85rem' }}
                    />
                </div>

                {/* Tipo */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[['all', 'Todos'], ['buy', 'Compras'], ['sell', 'Ventas']].map(([val, label]) => (
                        <button key={val} onClick={() => { setFilterType(val); setPage(0) }} style={{
                            padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                            border: filterType === val ? `1px solid ${val === 'buy' ? 'var(--success)' : val === 'sell' ? 'var(--danger)' : 'rgba(56,189,248,0.5)'}` : '1px solid rgba(255,255,255,0.08)',
                            background: filterType === val ? (val === 'buy' ? 'rgba(34,197,94,0.1)' : val === 'sell' ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.1)') : 'rgba(255,255,255,0.03)',
                            color: filterType === val ? (val === 'buy' ? 'var(--success)' : val === 'sell' ? 'var(--danger)' : 'var(--accent-color)') : 'var(--text-secondary)',
                            fontWeight: filterType === val ? '600' : '400',
                            transition: 'all 0.15s',
                        }}>{label}</button>
                    ))}
                </div>

                {/* Sector */}
                <select
                    value={filterSector}
                    onChange={e => { setFilterSector(e.target.value); setPage(0) }}
                    style={{
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px', color: filterSector ? 'var(--text-primary)' : 'var(--text-secondary)',
                        padding: '0.35rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', height: '36px',
                    }}
                >
                    <option value="">Todos los sectores</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Reset */}
                {hasActiveFilters && (
                    <button onClick={resetFilters} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px', color: 'var(--text-secondary)', padding: '0.35rem 0.6rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem',
                    }}>
                        <X size={13} /> Limpiar
                    </button>
                )}

                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    {filtered.length} de {operations.length} operaciones
                </span>
            </div>

            {/* Tabla */}
            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={thStyle('type')} onClick={() => handleSort('type')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Tipo <SortIcon col="type" /></span>
                            </th>
                            <th style={thStyle('ticker')} onClick={() => handleSort('ticker')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Ticker <SortIcon col="ticker" /></span>
                            </th>
                            <th style={thStyle('empresa')} onClick={() => handleSort('empresa')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Empresa <SortIcon col="empresa" /></span>
                            </th>
                            <th style={thStyle('sector')} onClick={() => handleSort('sector')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Sector <SortIcon col="sector" /></span>
                            </th>
                            <th style={thStyle('shares', 'right')} onClick={() => handleSort('shares')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>Acciones <SortIcon col="shares" /></span>
                            </th>
                            <th style={thStyle('price', 'right')} onClick={() => handleSort('price')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>Precio <SortIcon col="price" /></span>
                            </th>
                            <th style={thStyle('total', 'right')} onClick={() => handleSort('total')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>Total <SortIcon col="total" /></span>
                            </th>
                            <th style={thStyle('date')} onClick={() => handleSort('date')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Fecha <SortIcon col="date" /></span>
                            </th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Sin resultados para los filtros aplicados
                                </td>
                            </tr>
                        ) : paginated.map(op => (
                            <tr key={op.id}>
                                <td>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', borderRadius: '999px',
                                        fontSize: '0.8rem', fontWeight: '600',
                                        background: op.type === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: op.type === 'buy' ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        {op.type === 'buy' ? 'Compra' : 'Venta'}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{op.ticker}</td>
                                <td>{op.company_name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{op.sector}</td>
                                <td style={{ textAlign: 'right' }}>{Number(op.shares).toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(op.price, op.currency)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(op.shares * op.price, op.currency)}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{op.date}</td>
                                <td>
                                    <button
                                        onClick={() => onDelete(op.id)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem', transition: 'color 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem',
                }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Página {safePage + 1} de {totalPages} · {sorted.length} resultados
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[
                            { icon: ChevronsLeft, action: () => setPage(0), disabled: safePage === 0 },
                            { icon: ChevronLeft, action: () => setPage(p => Math.max(0, p - 1)), disabled: safePage === 0 },
                            { icon: ChevronRight, action: () => setPage(p => Math.min(totalPages - 1, p + 1)), disabled: safePage >= totalPages - 1 },
                            { icon: ChevronsRight, action: () => setPage(totalPages - 1), disabled: safePage >= totalPages - 1 },
                        ].map(({ icon: Icon, action, disabled }, i) => (
                            <button key={i} onClick={action} disabled={disabled} style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: disabled ? 'not-allowed' : 'pointer',
                                color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: disabled ? 0.4 : 1,
                                display: 'flex', alignItems: 'center',
                            }}>
                                <Icon size={15} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ImpactRow({ label, before, after, warn, warnMsg }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{before}</span>
                <ArrowRight size={12} color="var(--text-secondary)" />
                <span style={{ color: warn ? 'var(--danger)' : 'var(--success)' }}>{after}</span>
                {warn && (
                    <span title={warnMsg} style={{ cursor: 'help' }}>
                        <AlertTriangle size={13} color="var(--danger)" />
                    </span>
                )}
            </div>
        </div>
    )
}
