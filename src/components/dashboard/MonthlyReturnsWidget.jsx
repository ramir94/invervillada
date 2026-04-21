import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Calendar, Info } from 'lucide-react'

// Formatea 'YYYY-MM' → 'mmm yy' en español (ej. '2025-04' → 'abr 25')
const formatMonthLabel = (month) => {
    const [year, m] = month.split('-')
    const date = new Date(Number(year), Number(m) - 1, 1)
    const formatted = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    // Normaliza minúsculas y elimina punto de abreviatura si existe ("abr." → "abr")
    return formatted.replace('.', '').toLowerCase()
}

const SUCCESS = 'var(--success)'
const DANGER = 'var(--danger)'

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null
    const value = payload[0].value
    const color = value >= 0 ? SUCCESS : DANGER
    return (
        <div style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem',
        }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ color, fontWeight: '700' }}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </div>
        </div>
    )
}

export default function MonthlyReturnsWidget({ data }) {
    const hasEnough = Array.isArray(data) && data.length >= 2

    const chartData = hasEnough
        ? data.map(d => ({
            label: formatMonthLabel(d.month),
            value: Number(d.return_pct),
        }))
        : []

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--accent-color)" />
                Rentabilidad mensual (últimos 12 meses)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <Info size={12} />
                Variación MoM calculada desde los snapshots diarios del valor del portfolio.
            </p>

            {!hasEnough ? (
                <div style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                }}>
                    Histórico insuficiente para calcular rentabilidad mensual.
                </div>
            ) : (
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                                tickFormatter={(v) => `${v.toFixed(1)}%`}
                                width={50}
                            />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? SUCCESS : DANGER} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
