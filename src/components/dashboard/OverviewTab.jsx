import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Shield, DollarSign, Landmark, Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import SicavInfoWidget from './SicavInfoWidget';
import { DrawdownWidget, BenchmarkWidget, SicavNavBar } from './dashboardHelpers';

export default function OverviewTab({ analytics, drawdown, portfolioReturn, sicavData, sicavInfo, snapshotCount = 0 }) {
    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin datos de portfolio. Registra tu primera operación.
            </div>
        );
    }

    const {
        totalValue, totalDailyChange, totalDailyChangePct,
        totalUnrealizedPnL, totalUnrealizedPnLPct,
        totalAnnualIncome, portfolioYield,
        healthScore, alerts, fixedIncomeMetrics,
    } = analytics;

    const scoreColor = healthScore.score >= 70
        ? 'var(--success)'
        : healthScore.score >= 50
            ? '#eab308'
            : 'var(--danger)';

    const scoreLabel = healthScore.score >= 70
        ? 'Salud buena'
        : healthScore.score >= 50
            ? 'Atención requerida'
            : 'Riesgo elevado';

    const highAlerts = alerts.filter(a => a.severity === 'high');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Visión General</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Resumen ejecutivo del portfolio y estado actual.</p>
            </header>

            {/* Información SICAV — widget full-width, solo si hay fila en sicav_info */}
            <SicavInfoWidget sicavInfo={sicavInfo} />

            {/* Alertas críticas */}
            {highAlerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {highAlerts.map((alert, i) => (
                        <div key={i} style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                        }}>
                            <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <div style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '0.9rem' }}>{alert.message}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>{alert.action}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* KPI row */}
            <div className="dashboard-grid">
                {/* Patrimonio total + P&L real + variación diaria como secundario */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Patrimonio Total</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                                {formatCurrency(totalValue)}
                            </div>
                            <div style={{
                                fontSize: '0.85rem', marginTop: '0.35rem',
                                color: totalUnrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)',
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                            }}>
                                {totalUnrealizedPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                P&L total: {totalUnrealizedPnL >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnL)}
                                {' '}({totalUnrealizedPnLPct >= 0 ? '+' : ''}{totalUnrealizedPnLPct.toFixed(1)}%)
                            </div>
                            {/* Variación diaria — secundaria */}
                            <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Activity size={11} />
                                Hoy:
                                <span style={{ color: totalDailyChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {' '}{totalDailyChange >= 0 ? '+' : ''}{formatCurrency(totalDailyChange)}
                                    {' '}({totalDailyChangePct >= 0 ? '+' : ''}{totalDailyChangePct.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(56,189,248,0.1)', borderRadius: '12px' }}>
                            <Wallet color="var(--accent-color)" size={24} />
                        </div>
                    </div>
                </div>

                {/* Health Score dinámico */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Health Score</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: scoreColor }}>
                                {healthScore.score}
                                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '400' }}>/100</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: scoreColor, marginTop: '0.15rem' }}>{scoreLabel}</div>
                        </div>
                        <div style={{ padding: '10px', background: `rgba(${healthScore.score >= 70 ? '34,197,94' : healthScore.score >= 50 ? '234,179,8' : '239,68,68'},0.1)`, borderRadius: '12px' }}>
                            <Shield color={scoreColor} size={24} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Divers.', value: healthScore.breakdown.diversification },
                            { label: 'Concent.', value: healthScore.breakdown.concentration },
                            { label: 'Beta', value: healthScore.breakdown.beta },
                        ].map(item => (
                            <div key={item.label} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.2rem' }}>
                                {item.label}:
                                <span style={{ color: item.value >= 70 ? 'var(--success)' : item.value >= 50 ? '#eab308' : 'var(--danger)', fontWeight: '600' }}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ingreso Anual Estimado */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ingreso Anual Est.</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                                {formatCurrency(totalAnnualIncome)}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Yield:{' '}
                                <span style={{
                                    color: portfolioYield >= 2.5 ? 'var(--success)' : portfolioYield >= 1 ? '#eab308' : 'var(--text-secondary)',
                                    fontWeight: '600',
                                }}>
                                    {portfolioYield.toFixed(2)}%
                                </span>
                                {' '}· dividendos y cupones
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px' }}>
                            <DollarSign color="var(--success)" size={24} />
                        </div>
                    </div>
                </div>

                {/* Duración Portfolio — solo si hay RF */}
                {fixedIncomeMetrics && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duración Portfolio RF</h3>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#818cf8' }}>
                                    {fixedIncomeMetrics.portfolioDuration.toFixed(2)}
                                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '400' }}> años</span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                    TIR media:{' '}
                                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                                        {fixedIncomeMetrics.weightedYTM.toFixed(2)}%
                                    </span>
                                    {' '}· {fixedIncomeMetrics.bondCount} posiciones RF
                                </div>
                            </div>
                            <div style={{ padding: '10px', background: 'rgba(129,140,248,0.1)', borderRadius: '12px' }}>
                                <Landmark color="#818cf8" size={24} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Drawdown Tracker + SICAV NAV — misma fila en desktop, apilados en móvil */}
            <div style={{ display: 'grid', gridTemplateColumns: drawdown && sicavData?.price > 0 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '1.5rem', alignItems: 'stretch' }}>
                {drawdown && (
                    <DrawdownWidget drawdown={drawdown} totalValue={totalValue} snapshotCount={snapshotCount} />
                )}
                {sicavData && sicavData.price > 0 && (
                    <SicavNavBar data={sicavData} />
                )}
            </div>

            {/* Benchmark comparison */}
            {portfolioReturn && (
                <BenchmarkWidget portfolioReturn={portfolioReturn} />
            )}
        </div>
    );
}
