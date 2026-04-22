import { Landmark, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '../../utils/formatting'

// Formatea la fecha del informe en es-ES (ej: "17 de abril de 2026")
const formatReportDate = (dateStr) => {
    if (!dateStr) return ''
    // report_date viene como 'YYYY-MM-DD' — añadimos T00:00:00 para evitar desfases UTC
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Formatea un número entero con puntos de miles (es-ES)
const formatInteger = (value) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
}

// Formatea el valor liquidativo a 6 decimales + símbolo €
const formatNav = (value) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
    }).format(value) + ' €'
}

// Renderiza un porcentaje coloreado según el signo
const PercentValue = ({ value, withSign = true }) => {
    if (value == null) {
        return <span style={{ color: 'var(--text-secondary)' }}>—</span>
    }
    const num = Number(value)
    const color = num >= 0 ? 'var(--success)' : 'var(--danger)'
    const sign = withSign && num >= 0 ? '+' : ''
    return (
        <span style={{ color, fontWeight: '700' }}>
            {sign}{num.toFixed(2)}%
        </span>
    )
}

// Celda individual del grid de métricas
// minWidth:0 permite que el contenido se trunque correctamente en grids con auto-fit
const MetricCell = ({ label, children }) => (
    <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            {label}
        </div>
        <div style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
        }}>
            {children}
        </div>
    </div>
)

export default function SicavInfoWidget({ sicavInfo }) {
    if (!sicavInfo) return null

    const {
        report_date,
        nav_per_unit,
        shares_outstanding,
        patrimonio,
        num_holders,
        subscriptions_ytd,
        redemptions_ytd,
        ytd_return_pct,
        one_year_return_pct,
        three_year_return_annualized_pct,
    } = sicavInfo

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Landmark size={18} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                    Información SICAV — {formatReportDate(report_date)}
                </h3>
            </div>

            {/* Grid 2x3 con métricas principales */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.25rem',
            }}>
                <MetricCell label="Valor liquidativo">
                    {formatNav(nav_per_unit)}
                </MetricCell>

                <MetricCell label="Acciones en circulación">
                    {formatInteger(shares_outstanding)}
                </MetricCell>

                <MetricCell label="Patrimonio">
                    {patrimonio != null ? formatCurrency(Number(patrimonio)) : '—'}
                </MetricCell>

                <MetricCell label="Nº partícipes">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={14} color="var(--text-secondary)" />
                        {formatInteger(num_holders)}
                    </span>
                </MetricCell>

                <MetricCell label="Suscripciones YTD">
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '6px',
                        color: 'var(--success)',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                    }}>
                        <ArrowUpRight size={14} />
                        {subscriptions_ytd != null ? formatCurrency(Number(subscriptions_ytd)) : '—'}
                    </span>
                </MetricCell>

                <MetricCell label="Reembolsos YTD">
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '6px',
                        color: 'var(--danger)',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                    }}>
                        <ArrowDownRight size={14} />
                        {redemptions_ytd != null ? formatCurrency(Number(redemptions_ytd)) : '—'}
                    </span>
                </MetricCell>
            </div>

            {/* Fila de rentabilidades */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.88rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {ytd_return_pct != null && (Number(ytd_return_pct) >= 0
                        ? <TrendingUp size={14} color="var(--success)" />
                        : <TrendingDown size={14} color="var(--danger)" />)}
                    <span style={{ color: 'var(--text-secondary)' }}>Desde 31/12:</span>
                    <PercentValue value={ytd_return_pct} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Último año natural:</span>
                    <PercentValue value={one_year_return_pct} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Anualizada 3 años:</span>
                    <PercentValue value={three_year_return_annualized_pct} />
                </div>
            </div>
        </div>
    )
}
