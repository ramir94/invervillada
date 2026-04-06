import { useState } from 'react';
import { Bot, AlertTriangle, CheckCircle2, Info, Shield, Clock, BarChart2, TrendingDown, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { generateInsights } from '../../utils/analytics';
import { formatCurrency } from '../../utils/formatting';

const RATING_COLORS = {
    AAA: '#22c55e', AA: '#22c55e',
    A: '#38bdf8',
    BBB: '#eab308',
    BB: '#f97316', B: '#ef4444',
    NR: '#64748b',
};

const MATURITY_ORDER = ['<1Y', '1-3Y', '3-5Y', '>5Y'];
const MATURITY_COLORS = { '<1Y': '#ef4444', '1-3Y': '#38bdf8', '3-5Y': '#22c55e', '>5Y': '#a855f7' };

function KPICard({ label, value, subvalue, color }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            flex: 1,
            minWidth: '120px',
        }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: color ?? 'var(--text-primary)', lineHeight: 1.2 }}>
                {value}
            </div>
            {subvalue && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {subvalue}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ icon: Icon, colorRgb, title, subtitle }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.1rem' }}>
            <div style={{
                width: '34px', height: '34px', flexShrink: 0,
                background: `rgba(${colorRgb}, 0.12)`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={17} color={`rgb(${colorRgb})`} />
            </div>
            <div>
                <div style={{ fontWeight: '700', fontSize: '0.93rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{subtitle}</div>}
            </div>
        </div>
    );
}

function DistributionBar({ label, pct, color, extraLabel }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
            <div style={{ width: '48px', fontSize: '0.77rem', color: 'var(--text-secondary)', flexShrink: 0, textAlign: 'right' }}>
                {label}
            </div>
            <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ width: '36px', fontSize: '0.77rem', color: 'var(--text-primary)', fontWeight: '600', flexShrink: 0 }}>
                {pct.toFixed(0)}%
            </div>
            {extraLabel && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{extraLabel}</div>
            )}
        </div>
    );
}

function AlertBadge({ severity, message, action }) {
    const cfg = {
        high:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.28)',   text: '#ef4444' },
        medium: { bg: 'rgba(234,179,8,0.07)',   border: 'rgba(234,179,8,0.25)',   text: '#eab308' },
        low:    { bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.2)',   text: '#38bdf8' },
    };
    const c = cfg[severity] ?? cfg.low;
    return (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.5' }}>{message}</div>
            {action && (
                <div style={{ marginTop: '0.3rem', fontSize: '0.77rem', color: c.text, opacity: 0.9 }}>
                    → {action}
                </div>
            )}
        </div>
    );
}

function CollapsibleSection({ title, count, children, defaultExpanded = true, accentColor = 'var(--text-secondary)' }) {
    const [open, setOpen] = useState(defaultExpanded);
    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '0.6rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: accentColor, borderBottom: `1px solid rgba(255,255,255,0.06)`, marginBottom: open ? '0.85rem' : 0,
                }}
            >
                <span style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {title}{count !== undefined ? ` (${count})` : ''}
                </span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open && children}
        </div>
    );
}

export default function AIAnalysis({ analytics }) {
    if (!analytics) {
        return (
            <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Bot size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>Sin datos de portfolio. Registra operaciones para ver el análisis.</p>
            </div>
        );
    }

    const {
        positions, totalValue, totalUnrealizedPnL, totalUnrealizedPnLPct,
        portfolioBeta, assetAllocation, fixedIncomeMetrics, alerts,
        totalAnnualIncome, portfolioYield, healthScore,
    } = analytics;

    const now = new Date();

    // Partición por tipo
    const equityPositions = positions.filter(p => (p.asset_type ?? 'equity') === 'equity');
    const bondPositions   = positions.filter(p => p.asset_type === 'bond' || p.asset_type === 'bond_etf');
    const cashPositions   = positions.filter(p => p.asset_type === 'cash');

    const equityValue = equityPositions.reduce((s, p) => s + p.value, 0);
    const cashValue   = cashPositions.reduce((s, p) => s + p.value, 0);

    // Beta del componente RV (excluye bonos y cash)
    const equityBeta = equityValue > 0
        ? equityPositions.reduce((s, p) => s + (p.value / equityValue) * p.beta, 0)
        : 0;

    // Impacto de +100pb en la cartera RF
    const durationImpactEur = fixedIncomeMetrics
        ? fixedIncomeMetrics.portfolioDuration * 0.01 * fixedIncomeMetrics.totalBondValue
        : 0;

    // Vencimientos próximos (<12 meses), solo bonos individuales
    const upcomingMaturities = bondPositions
        .filter(p => p.maturity_date && p.asset_type === 'bond')
        .map(p => {
            const days = (new Date(p.maturity_date) - now) / (1000 * 60 * 60 * 24);
            return { ...p, daysToMaturity: days };
        })
        .filter(p => p.daysToMaturity > 0 && p.daysToMaturity < 365)
        .sort((a, b) => a.daysToMaturity - b.daysToMaturity);

    // Bonos con caída significativa (distressed)
    const bondLosses = bondPositions
        .filter(p => p.unrealizedPnLPct < -10 && p.asset_type === 'bond')
        .sort((a, b) => a.unrealizedPnLPct - b.unrealizedPnLPct);

    // RV: posiciones con pérdida > 15%
    const equityLosses = equityPositions
        .filter(p => p.unrealizedPnLPct < -15)
        .sort((a, b) => a.unrealizedPnLPct - b.unrealizedPnLPct);

    // Separar alertas por sección
    const RF_ALERT_TYPES = new Set(['duration_risk', 'credit_risk', 'maturity_concentration']);
    const rfAlerts = alerts.filter(a => RF_ALERT_TYPES.has(a.type));
    const rvAlerts = alerts.filter(a => !RF_ALERT_TYPES.has(a.type) && a.type !== 'deterioration');
    const deteriorationAlerts = alerts.filter(a => a.type === 'deterioration');

    const insights = generateInsights(analytics);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const pnlColor = totalUnrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)';
    const pnlSign  = totalUnrealizedPnL >= 0 ? '+' : '';

    const scoreColor = healthScore.score >= 70 ? 'var(--success)' : healthScore.score >= 45 ? '#eab308' : 'var(--danger)';
    const durationColor = fixedIncomeMetrics?.portfolioDuration > 5 ? 'var(--danger)'
        : fixedIncomeMetrics?.portfolioDuration > 3 ? '#eab308' : '#e2e8f0';

    // Top 5 posiciones RV para el chart de barras (relativo a la mayor)
    const topEquity = [...equityPositions].sort((a, b) => b.weight - a.weight).slice(0, 5);
    const maxEquityWeight = topEquity[0]?.weight ?? 1;

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── CABECERA ─────────────────────────────────────────────── */}
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <Bot size={20} color="var(--accent-color)" />
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Informe de Gestión — SICAV Invervillada</h2>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Corte: {now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}{positions.length} posiciones · patrimonio {formatCurrency(totalValue)}
                    </div>
                </div>
                <div style={{
                    padding: '0.5rem 1rem',
                    background: `rgba(${healthScore.score >= 70 ? '34,197,94' : healthScore.score >= 45 ? '234,179,8' : '239,68,68'}, 0.1)`,
                    border: `1px solid rgba(${healthScore.score >= 70 ? '34,197,94' : healthScore.score >= 45 ? '234,179,8' : '239,68,68'}, 0.3)`,
                    borderRadius: '8px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: scoreColor, lineHeight: 1 }}>{healthScore.score}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health Score</div>
                </div>
            </header>

            {/* ── KPIs EJECUTIVOS ──────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <KPICard
                    label="RF / RV / Cash"
                    value={`${assetAllocation.bond.toFixed(0)}% · ${assetAllocation.equity.toFixed(0)}% · ${assetAllocation.cash.toFixed(0)}%`}
                    subvalue="Asignación de activos"
                    color="var(--text-primary)"
                />
                <KPICard
                    label="Beta Portfolio"
                    value={portfolioBeta.toFixed(2)}
                    subvalue={`Beta RV: ${equityBeta.toFixed(2)}`}
                    color={portfolioBeta > 1.1 ? 'var(--danger)' : portfolioBeta > 0.8 ? '#eab308' : 'var(--success)'}
                />
                {fixedIncomeMetrics && (
                    <KPICard
                        label="Duración RF"
                        value={`${fixedIncomeMetrics.portfolioDuration.toFixed(2)} a`}
                        subvalue={`TIR media: ${(fixedIncomeMetrics.weightedYTM * 100).toFixed(2)}%`}
                        color={durationColor}
                    />
                )}
                <KPICard
                    label="P&L Total"
                    value={`${pnlSign}${totalUnrealizedPnLPct.toFixed(1)}%`}
                    subvalue={`${pnlSign}${formatCurrency(totalUnrealizedPnL)}`}
                    color={pnlColor}
                />
                {totalAnnualIncome > 0 && (
                    <KPICard
                        label="Yield / Ingreso anual"
                        value={`${portfolioYield.toFixed(2)}%`}
                        subvalue={formatCurrency(totalAnnualIncome) + '/año'}
                        color="var(--success)"
                    />
                )}
            </div>

            {/* ── RENTA FIJA ───────────────────────────────────────────── */}
            {fixedIncomeMetrics && (
                <div className="glass-panel" style={{ padding: '1.4rem' }}>
                    <SectionHeader
                        icon={Shield}
                        colorRgb="168,85,247"
                        title={`Renta Fija — ${formatCurrency(fixedIncomeMetrics.totalBondValue)} (${assetAllocation.bond.toFixed(0)}% del portfolio)`}
                        subtitle={`${fixedIncomeMetrics.bondCount} instrumentos · ${bondPositions.filter(p => p.asset_type === 'bond').length} bonos individuales · ${bondPositions.filter(p => p.asset_type === 'bond_etf').length} ETFs RF`}
                    />

                    {/* Sensibilidad a tipos */}
                    <div style={{
                        display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                        padding: '0.9rem 1rem',
                        background: 'rgba(168,85,247,0.07)',
                        border: '1px solid rgba(168,85,247,0.2)',
                        borderRadius: '8px',
                        marginBottom: '1.25rem',
                    }}>
                        <div>
                            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: durationColor }}>
                                {fixedIncomeMetrics.portfolioDuration.toFixed(2)} años
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Duración modificada</div>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem' }}>
                            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#ef4444' }}>
                                −{formatCurrency(durationImpactEur)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Impacto estimado si tipos +100pb</div>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem' }}>
                            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#22c55e' }}>
                                {(fixedIncomeMetrics.weightedYTM * 100).toFixed(2)}%
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>TIR media pond. en compra</div>
                        </div>
                    </div>

                    {/* Rating + Vencimientos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                                Calidad crediticia
                            </div>
                            {Object.entries(fixedIncomeMetrics.ratingDistribution)
                                .sort((a, b) => {
                                    const order = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'NR'];
                                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                                })
                                .map(([rating, pct]) => (
                                    <DistributionBar key={rating} label={rating} pct={pct} color={RATING_COLORS[rating] ?? '#64748b'} />
                                ))
                            }
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                                Perfil de vencimientos
                            </div>
                            {MATURITY_ORDER.map(bucket => {
                                const pct = fixedIncomeMetrics.maturityDistribution[bucket] ?? 0;
                                if (pct < 0.5) return null;
                                return <DistributionBar key={bucket} label={bucket} pct={pct} color={MATURITY_COLORS[bucket]} />;
                            })}
                        </div>
                    </div>

                    {/* Vencimientos próximos */}
                    {upcomingMaturities.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Clock size={11} /> Vencimientos próximos (&lt;12 meses)
                            </div>
                            {upcomingMaturities.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < upcomingMaturities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{p.name ?? p.ticker}</span>
                                        {p.rating && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: RATING_COLORS[p.rating] ?? 'var(--text-secondary)' }}>{p.rating}</span>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ef4444' }}>{formatDate(p.maturity_date)}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{formatCurrency(p.value)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bonos en pérdida / distressed */}
                    {bondLosses.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <AlertTriangle size={11} /> Posiciones bajo coste de adquisición
                            </div>
                            {bondLosses.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < bondLosses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{p.name ?? p.ticker}</span>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.ticker}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)' }}>
                                            {p.currentPrice?.toFixed(1) ?? '—'}% nominal
                                            <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: '400' }}>
                                                ({p.unrealizedPnLPct >= 0 ? '+' : ''}{p.unrealizedPnLPct.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{formatCurrency(p.unrealizedPnL)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Alertas RF */}
                    {rfAlerts.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {rfAlerts.map((a, i) => (
                                <AlertBadge key={i} severity={a.severity} message={a.message} action={a.action} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── RENTA VARIABLE ───────────────────────────────────────── */}
            {equityPositions.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.4rem' }}>
                    <SectionHeader
                        icon={BarChart2}
                        colorRgb="34,197,94"
                        title={`Renta Variable — ${formatCurrency(equityValue)} (${assetAllocation.equity.toFixed(0)}% del portfolio)`}
                        subtitle={`${equityPositions.length} posiciones · Beta RV: ${equityBeta.toFixed(2)}`}
                    />

                    {/* Top posiciones equity: barras proporcionales */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                            Principales posiciones (% sobre patrimonio total)
                        </div>
                        {topEquity.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                                <div style={{ width: '40px', fontSize: '0.77rem', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                                    {p.weight.toFixed(1)}%
                                </div>
                                <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(p.weight / maxEquityWeight) * 100}%`,
                                        height: '100%',
                                        background: 'var(--success)',
                                        borderRadius: '4px',
                                        opacity: 1 - i * 0.12,
                                        transition: 'width 0.4s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', minWidth: '130px', flexShrink: 0 }}>
                                    {p.name ?? p.ticker}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: p.unrealizedPnLPct >= 0 ? 'var(--success)' : 'var(--danger)', minWidth: '56px', textAlign: 'right', fontWeight: '600', flexShrink: 0 }}>
                                    {p.unrealizedPnLPct >= 0 ? '+' : ''}{p.unrealizedPnLPct.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Posiciones RV con pérdida significativa */}
                    {equityLosses.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem', marginBottom: rvAlerts.length > 0 ? '0.9rem' : 0 }}>
                            <div style={{ fontSize: '0.72rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <TrendingDown size={11} /> Posiciones con pérdida &gt;15%
                            </div>
                            {equityLosses.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < equityLosses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{p.name ?? p.ticker}</span>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.ticker}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)' }}>
                                            {p.unrealizedPnLPct.toFixed(1)}%
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                            {formatCurrency(p.unrealizedPnL)} · peso {p.weight.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Alertas RV */}
                    {rvAlerts.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {rvAlerts.map((a, i) => (
                                <AlertBadge key={i} severity={a.severity} message={a.message} action={a.action} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── LIQUIDEZ ─────────────────────────────────────────────── */}
            {cashPositions.length > 0 && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(234,179,8,0.05)',
                    border: '1px solid rgba(234,179,8,0.18)',
                    borderRadius: '10px',
                }}>
                    <div>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#e2e8f0' }}>
                            Liquidez / Monetario — {assetAllocation.cash.toFixed(1)}% del portfolio
                        </div>
                        <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {cashPositions.map(p => p.name ?? p.ticker).join(' · ')}
                        </div>
                    </div>
                    <div style={{ fontWeight: '700', color: '#eab308', fontSize: '1rem' }}>
                        {formatCurrency(cashValue)}
                    </div>
                </div>
            )}

            {/* ── RESUMEN DE INSIGHTS ──────────────────────────────────── */}
            {(insights.critical.length > 0 || insights.warning.length > 0 || insights.positive.length > 0) && (
                <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.1rem' }}>
                        <Activity size={17} color="var(--accent-color)" />
                        <span style={{ fontWeight: '700', fontSize: '0.93rem' }}>Observaciones del Analista</span>
                    </div>

                    {insights.critical.length > 0 && (
                        <CollapsibleSection title="Crítico — Acción requerida" count={insights.critical.length} accentColor="var(--danger)" defaultExpanded={true}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {insights.critical.map((item, i) => (
                                    <AlertBadge key={i} severity="high" message={item.title} action={item.action} />
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}

                    {insights.warning.length > 0 && (
                        <CollapsibleSection title="Atención — Revisar próximamente" count={insights.warning.length} accentColor="#eab308" defaultExpanded={insights.critical.length === 0}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {insights.warning.map((item, i) => (
                                    <AlertBadge key={i} severity="medium" message={item.title} action={item.action} />
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}

                    {insights.positive.length > 0 && (
                        <CollapsibleSection title="Positivo — Lo que está funcionando" count={insights.positive.length} accentColor="var(--success)" defaultExpanded={insights.critical.length === 0 && insights.warning.length === 0}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {insights.positive.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0', borderBottom: i < insights.positive.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                        <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}
                </div>
            )}

            {/* ── NOTA METODOLÓGICA ────────────────────────────────────── */}
            <div style={{
                padding: '0.8rem 1rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
            }}>
                <strong>Metodología:</strong> Valoración por precio medio ponderado FIFO.
                Duración RF: media ponderada por valor de mercado de la posición.
                Impacto tipos: aproximación ΔP ≈ −D_mod × Δy × Valor (lineal, sin convexidad).
                Beta portfolio: proxy por sector GICS, ponderada por peso. HHI incluye todas las clases de activo.
            </div>
        </div>
    );
}
