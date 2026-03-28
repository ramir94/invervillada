import { Bot, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { generateInsights } from '../../utils/analytics';

function InsightCard({ icon: Icon, iconColor, bgColor, borderColor, title, items, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded)

    if (!items.length) return null

    return (
        <div style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '10px',
            overflow: 'hidden',
        }}>
            <button
                onClick={() => setExpanded(v => !v)}
                style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Icon size={16} color={iconColor} />
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: iconColor }}>
                        {title} ({items.length})
                    </span>
                </div>
                {expanded
                    ? <ChevronUp size={16} color="var(--text-secondary)" />
                    : <ChevronDown size={16} color="var(--text-secondary)" />
                }
            </button>

            {expanded && (
                <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map((item, i) => (
                        <div key={i} style={{ borderTop: i === 0 ? `1px solid ${borderColor}` : 'none', paddingTop: i === 0 ? '0.75rem' : 0 }}>
                            <div style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.5' }}>
                                {item.title}
                            </div>
                            {item.action && (
                                <div style={{
                                    marginTop: '0.4rem',
                                    fontSize: '0.8rem',
                                    color: iconColor,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.35rem',
                                    opacity: 0.85,
                                }}>
                                    <span style={{ flexShrink: 0 }}>→</span>
                                    {item.action}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AIAnalysis({ analytics }) {
    if (!analytics) {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Bot size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>Sin datos de portfolio. Registra operaciones para ver el análisis.</p>
            </div>
        )
    }

    const insights = generateInsights(analytics)
    const { critical, warning, positive } = insights

    const totalInsights = critical.length + warning.length + positive.length
    const hasProblems = critical.length > 0 || warning.length > 0

    const summaryColor = critical.length > 0
        ? 'var(--danger)'
        : warning.length > 0
            ? '#eab308'
            : 'var(--success)'

    const summaryText = critical.length > 0
        ? `${critical.length} problema${critical.length > 1 ? 's' : ''} crítico${critical.length > 1 ? 's' : ''} detectado${critical.length > 1 ? 's' : ''}`
        : warning.length > 0
            ? `${warning.length} punto${warning.length > 1 ? 's' : ''} de atención`
            : 'Sin problemas detectados'

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{
                    width: '64px', height: '64px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
                }}>
                    <Bot size={32} color="white" />
                </div>
                <h2>AI Portfolio Analyst</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Análisis basado en tus posiciones reales · {totalInsights} observaciones
                </p>
            </header>

            {/* Resumen ejecutivo dinámico */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                        padding: '10px',
                        background: `rgba(${critical.length > 0 ? '239,68,68' : warning.length > 0 ? '234,179,8' : '34,197,94'},0.1)`,
                        borderRadius: '10px',
                        flexShrink: 0,
                    }}>
                        {hasProblems
                            ? <AlertTriangle size={22} color={summaryColor} />
                            : <CheckCircle2 size={22} color={summaryColor} />
                        }
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', color: summaryColor, marginBottom: '0.4rem' }}>
                            {summaryText}
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.6' }}>
                            Portfolio de <strong>{analytics.positions.length} posiciones</strong>{' '}
                            · Health Score: <strong style={{ color: summaryColor }}>{analytics.healthScore.score}/100</strong>{' '}
                            · Beta: <strong>{analytics.portfolioBeta.toFixed(2)}</strong>{' '}
                            · Top 3: <strong style={{ color: analytics.top3Weight > 60 ? 'var(--danger)' : '#e2e8f0' }}>
                                {analytics.top3Weight.toFixed(1)}%
                            </strong>
                        </div>
                        {analytics.totalUnrealizedPnL !== 0 && (
                            <div style={{
                                marginTop: '0.5rem',
                                fontSize: '0.85rem',
                                color: analytics.totalUnrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)',
                                fontWeight: '600',
                            }}>
                                P&L total no realizado: {analytics.totalUnrealizedPnL >= 0 ? '+' : ''}
                                {analytics.totalUnrealizedPnL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                {' '}({analytics.totalUnrealizedPnLPct >= 0 ? '+' : ''}{analytics.totalUnrealizedPnLPct.toFixed(1)}%)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Problemas críticos */}
                {critical.length > 0 && (
                    <InsightCard
                        icon={AlertTriangle}
                        iconColor="var(--danger)"
                        bgColor="rgba(239,68,68,0.08)"
                        borderColor="rgba(239,68,68,0.25)"
                        title="Crítico — Acción requerida"
                        items={critical}
                        defaultExpanded={true}
                    />
                )}

                {/* Advertencias */}
                {warning.length > 0 && (
                    <InsightCard
                        icon={AlertTriangle}
                        iconColor="#eab308"
                        bgColor="rgba(234,179,8,0.07)"
                        borderColor="rgba(234,179,8,0.22)"
                        title="Atención — Revisar próximamente"
                        items={warning}
                        defaultExpanded={critical.length === 0}
                    />
                )}

                {/* Positivos */}
                {positive.length > 0 && (
                    <InsightCard
                        icon={CheckCircle2}
                        iconColor="var(--success)"
                        bgColor="rgba(34,197,94,0.06)"
                        borderColor="rgba(34,197,94,0.2)"
                        title="Positivo — Lo que está funcionando"
                        items={positive}
                        defaultExpanded={!hasProblems}
                    />
                )}

                {totalInsights === 0 && (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Info size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                        <p>No hay suficientes datos para generar insights. Añade más posiciones a tu portfolio.</p>
                    </div>
                )}
            </div>

            {/* Nota metodológica */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                fontSize: '0.77rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
            }}>
                <strong>Metodología:</strong> Análisis basado en precio medio ponderado de operaciones registradas, betas proxy por sector,
                índice HHI de concentración y clasificación por factores (growth/defensive/dividend/cyclical).
                Los datos de mercado son simulados — en producción conectar a API real (Yahoo Finance, Alpha Vantage).
            </div>
        </div>
    )
}
