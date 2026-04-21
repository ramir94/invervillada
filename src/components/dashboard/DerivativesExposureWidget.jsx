import { Sigma, Info } from 'lucide-react'
import { formatCurrency } from '../../utils/formatting'

// Etiquetas legibles para los tipos de instrumento
const INSTRUMENT_LABELS = {
    fx_forward: 'Forward FX',
    option: 'Opción',
    future: 'Futuro',
    swap: 'Swap',
    other: 'Otro',
}

const DIRECTION_LABELS = {
    long: 'Larga',
    short: 'Corta',
}

// Formatea la fecha en es-ES (dd/mm/yyyy)
const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Formatea nocional en su divisa nativa (sin convertir a EUR).
const formatNotional = (notional, currency) => {
    if (notional == null) return '—'
    const num = Number(notional)
    try {
        return num.toLocaleString('es-ES', {
            style: 'currency',
            currency: currency ?? 'EUR',
            maximumFractionDigits: 0,
        })
    } catch {
        // Divisa no soportada por Intl — fallback a número + código
        return `${num.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${currency ?? ''}`
    }
}

export default function DerivativesExposureWidget({ exposures }) {
    // Solo se renderiza si hay al menos 1 fila
    if (!exposures || exposures.length === 0) return null

    // Caso "reportado pero sin posiciones vivas": todas las filas con nocional=0 y market_value_eur=0
    const allZero = exposures.every(r =>
        Number(r.notional ?? 0) === 0 && Number(r.market_value_eur ?? 0) === 0
    )

    if (allZero) {
        return (
            <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sigma size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        Exposición a derivados:
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {formatCurrency(0)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        (sin posiciones vivas)
                    </span>
                </div>
            </div>
        )
    }

    const grossExposure = exposures.reduce(
        (s, r) => s + Math.abs(Number(r.market_value_eur ?? 0)),
        0
    )

    const reportDate = exposures[0]?.report_date

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Sigma size={18} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Exposición a derivados</h3>
            </div>
            <p style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.3rem',
                alignItems: 'center',
            }}>
                <Info size={12} />
                Posiciones abiertas a fecha de {formatDate(reportDate)}.
            </p>

            {/* Tabla responsive con scroll horizontal en móvil */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    minWidth: '720px',
                }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={thStyle}>Instrumento</th>
                            <th style={thStyle}>Subyacente</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Nocional</th>
                            <th style={thStyle}>Dirección</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Valor mercado (EUR)</th>
                            <th style={thStyle}>Vencimiento</th>
                            <th style={thStyle}>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exposures.map(row => {
                            const mv = Number(row.market_value_eur ?? 0)
                            const mvColor = mv >= 0 ? 'var(--success)' : 'var(--danger)'
                            return (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={tdStyle}>
                                        {INSTRUMENT_LABELS[row.instrument_type] ?? row.instrument_type}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                            {row.underlying_ticker ?? '—'}
                                        </div>
                                        {row.underlying_asset_class && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                {row.underlying_asset_class}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        {formatNotional(row.notional, row.notional_currency)}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: row.direction === 'long'
                                                ? 'rgba(34,197,94,0.12)'
                                                : 'rgba(239,68,68,0.12)',
                                            color: row.direction === 'long' ? 'var(--success)' : 'var(--danger)',
                                        }}>
                                            {DIRECTION_LABELS[row.direction] ?? row.direction}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: mvColor, fontWeight: '600' }}>
                                        {formatCurrency(mv)}
                                    </td>
                                    <td style={tdStyle}>{formatDate(row.maturity_date)}</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                        {row.notes ?? '—'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Total exposición bruta */}
            <div style={{
                marginTop: '1rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
            }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Exposición bruta (suma de valores absolutos de mercado)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {formatCurrency(grossExposure)}
                </div>
            </div>
        </div>
    )
}

const thStyle = {
    padding: '0.5rem 0.6rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
}

const tdStyle = {
    padding: '0.6rem',
    verticalAlign: 'top',
    color: 'var(--text-primary)',
}
