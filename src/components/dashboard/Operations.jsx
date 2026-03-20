import { useState } from 'react'
import { PlusCircle, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { addOperation, deleteOperation } from '../../services/operations'
import { formatCurrency } from '../../utils/formatting'

const SECTORS = [
    'Health Care', 'Technology', 'Consumer Staples', 'Consumer Discretionary',
    'Industrials', 'Real Estate', 'Energy', 'Financials', 'Materials',
    'Communication Services', 'Utilities', 'Other'
]

const emptyForm = {
    ticker: '',
    company_name: '',
    sector: 'Other',
    type: 'buy',
    shares: '',
    price: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
}

export default function Operations({ operations, onOperationAdded, onOperationDeleted }) {
    const [form, setForm] = useState(emptyForm)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showForm, setShowForm] = useState(false)

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const op = await addOperation({
                ...form,
                shares: Number(form.shares),
                price: Number(form.price),
            })
            onOperationAdded(op)
            setForm(emptyForm)
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

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

            {/* Form */}
            {showForm && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Registrar operación</h3>
                    <form onSubmit={handleSubmit}>
                        {/* Buy / Sell toggle */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {['buy', 'sell'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, type: t }))}
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ticker *</label>
                                <input
                                    className="login-input"
                                    name="ticker"
                                    placeholder="AAPL"
                                    value={form.ticker}
                                    onChange={handleChange}
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Empresa *</label>
                                <input
                                    className="login-input"
                                    name="company_name"
                                    placeholder="Apple Inc."
                                    value={form.company_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sector *</label>
                                <select
                                    className="login-input"
                                    name="sector"
                                    value={form.sector}
                                    onChange={handleChange}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Divisa *</label>
                                <select
                                    className="login-input"
                                    name="currency"
                                    value={form.currency}
                                    onChange={handleChange}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="CHF">CHF</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha *</label>
                                <input
                                    className="login-input"
                                    name="date"
                                    type="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                    style={{ maxWidth: '200px' }}
                                />
                            </div>
                        </div>

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

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar operación'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setForm(emptyForm); setError(null) }}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Operations list */}
            {operations.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <PlusCircle size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p>No hay operaciones registradas. ¡Añade tu primera compra!</p>
                </div>
            ) : (
                <div className="glass-panel table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Ticker</th>
                                <th>Empresa</th>
                                <th>Sector</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                                <th style={{ textAlign: 'right' }}>Precio</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                                <th>Fecha</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {operations.map(op => (
                                <tr key={op.id}>
                                    <td>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '999px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
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
                                            onClick={() => handleDelete(op.id)}
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
            )}
        </div>
    )
}
