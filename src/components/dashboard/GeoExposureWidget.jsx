import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Globe, Info } from 'lucide-react'

// Orden de presentación según el informe Singular Bank
const GROUP_ORDER = ['Estados Unidos', 'Europa Zona no Euro', 'Zona Euro', 'Otros']

const GROUP_COLORS = {
    'Estados Unidos': '#38bdf8',
    'Europa Zona no Euro': '#818cf8',
    'Zona Euro': '#22c55e',
    'Otros': '#94a3b8',
}

function CustomTooltip({ active, payload }) {
    if (!active || !payload || payload.length === 0) return null
    const { name, value } = payload[0]
    return (
        <div style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem',
        }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{name}</div>
            <div style={{ color: GROUP_COLORS[name] ?? '#94a3b8', fontWeight: '700' }}>
                {value.toFixed(2)}%
            </div>
        </div>
    )
}

export default function GeoExposureWidget({ geoExposure }) {
    const entries = geoExposure
        ? Object.entries(geoExposure).filter(([, v]) => v > 0.01)
        : []

    if (entries.length === 0) {
        return null
    }

    // Ordenar según GROUP_ORDER para mantener consistencia con el informe
    const data = entries
        .sort(([a], [b]) => {
            const ia = GROUP_ORDER.indexOf(a)
            const ib = GROUP_ORDER.indexOf(b)
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        })
        .map(([name, value]) => ({ name, value }))

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} color="var(--accent-color)" />
                Distribución geográfica RV
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <Info size={12} />
                Exposición de la cartera de Renta Variable por región.
            </p>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            outerRadius={80}
                            innerRadius={45}
                            stroke="#1e293b"
                            strokeWidth={2}
                        >
                            {data.map((entry, i) => (
                                <Cell key={`geo-${i}`} fill={GROUP_COLORS[entry.name] ?? '#94a3b8'} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }}
                            formatter={(value) => (
                                <span style={{ color: '#94a3b8' }}>{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
