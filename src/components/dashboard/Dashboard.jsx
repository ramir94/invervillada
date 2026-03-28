import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/formatting';
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Activity, Shield, Target, Info, BarChart2 } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const FACTOR_LABELS = {
    growth: 'Crecimiento (Growth)',
    defensive: 'Defensivo',
    dividend: 'Dividendo / Value',
    cyclical: 'Cíclico',
    other: 'Otros',
};

const FACTOR_COLORS = {
    growth: '#818cf8',
    defensive: '#22c55e',
    dividend: '#38bdf8',
    cyclical: '#eab308',
    other: '#94a3b8',
};

export default function Dashboard({ analytics, drawdown }) {
    const sectorChartData = useMemo(() => {
        if (!analytics) return null;
        const sectorMap = {};
        analytics.positions.forEach(p => {
            sectorMap[p.sector] = (sectorMap[p.sector] ?? 0) + p.value;
        });
        return {
            labels: Object.keys(sectorMap),
            datasets: [{
                data: Object.values(sectorMap),
                backgroundColor: ['#38bdf8','#818cf8','#c084fc','#f472b6','#22c55e','#eab308','#f97316','#94a3b8'],
                borderColor: '#1e293b',
                borderWidth: 2,
            }],
        };
    }, [analytics]);

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
        top3Weight, top3, portfolioBeta,
        factorExposure, healthScore, alerts, positions,
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
    const medAlerts = alerts.filter(a => a.severity === 'medium');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Visión General</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Estado real del portfolio y señales de riesgo activas.</p>
            </header>

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
                {/* Patrimonio total + P&L real */}
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

                {/* Variación diaria — posición secundaria */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Variación Diaria</h3>
                            <div style={{
                                fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem',
                                color: totalDailyChange >= 0 ? 'var(--success)' : 'var(--danger)',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}>
                                {totalDailyChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                {formatCurrency(Math.abs(totalDailyChange))}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                {totalDailyChangePct >= 0 ? '+' : ''}{totalDailyChangePct.toFixed(2)}% hoy
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                                    · {positions.length} posiciones
                                </span>
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: totalDailyChange >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '12px' }}>
                            <Activity color={totalDailyChange >= 0 ? 'var(--success)' : 'var(--danger)'} size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Drawdown Tracker */}
            {drawdown && (
                <DrawdownWidget drawdown={drawdown} totalValue={totalValue} />
            )}

            {/* Alertas medias */}
            {medAlerts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {medAlerts.map((alert, i) => (
                        <div key={i} style={{
                            background: 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.25)',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            gap: '0.75rem',
                        }}>
                            <AlertTriangle size={15} color="#eab308" style={{ flexShrink: 0, marginTop: '3px' }} />
                            <div>
                                <div style={{ color: '#fde047', fontWeight: '600', fontSize: '0.83rem' }}>{alert.message}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.1rem' }}>{alert.action}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Concentración + Factor Exposure */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                {/* Concentración */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={16} color="var(--accent-color)" />
                        Concentración
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Top 3 posiciones</span>
                            <span style={{
                                fontSize: '0.9rem', fontWeight: '700',
                                color: top3Weight > 60 ? 'var(--danger)' : top3Weight > 45 ? '#eab308' : 'var(--success)',
                            }}>
                                {top3Weight.toFixed(1)}%
                                {top3Weight > 60 && ' ⚠'}
                            </span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(100, top3Weight)}%`,
                                background: top3Weight > 60 ? 'var(--danger)' : top3Weight > 45 ? '#eab308' : 'var(--success)',
                                borderRadius: '4px',
                                transition: 'width 0.5s',
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {top3.map((p, i) => (
                            <div key={p.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: '16px' }}>#{i + 1}</span>
                                    <span style={{ color: 'var(--accent-color)', fontWeight: '700', fontSize: '0.9rem' }}>{p.ticker}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${p.weight}%`, background: 'var(--accent-color)', borderRadius: '3px' }} />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', minWidth: '36px', textAlign: 'right' }}>{p.weight.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Beta portfolio:
                        <span style={{
                            color: portfolioBeta > 1.2 ? 'var(--danger)' : portfolioBeta > 1.0 ? '#eab308' : 'var(--success)',
                            fontWeight: '600', marginLeft: '0.3rem',
                        }}>
                            {portfolioBeta.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Factor Exposure */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.4rem' }}>Exposición por Factor</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <Info size={12} />
                        Más informativo que la distribución sectorial
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {Object.entries(factorExposure)
                            .sort((a, b) => b[1] - a[1])
                            .map(([factor, weight]) => (
                                <div key={factor}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: FACTOR_COLORS[factor] ?? '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                                            {FACTOR_LABELS[factor] ?? factor}
                                            {factor === 'growth' && weight > 50 && (
                                                <span style={{ color: '#eab308', fontSize: '0.72rem' }}>{'⚠ >50%'}</span>
                                            )}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{weight.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, weight)}%`,
                                            background: FACTOR_COLORS[factor] ?? '#94a3b8',
                                            borderRadius: '4px',
                                            transition: 'width 0.5s',
                                        }} />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Sector doughnut — secundario */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.35rem' }}>Distribución por Sector</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Info size={12} />
                    La distribución sectorial puede ocultar correlaciones. Consulta la exposición por factor como referencia principal.
                </p>
                <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
                    {sectorChartData && (
                        <Doughnut
                            data={sectorChartData}
                            options={{
                                plugins: {
                                    legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } }
                                },
                                maintainAspectRatio: false,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function DrawdownWidget({ drawdown, totalValue }) {
    const { maxValue, maxDate, drawdownPct, drawdownAbs, recoveryNeededPct } = drawdown;
    const isAtMax = drawdownPct >= -0.01; // prácticamente en máximos
    const isSignificant = drawdownPct < -5;

    const barWidth = isAtMax ? 100 : Math.max(0, 100 + drawdownPct); // % del máximo que conservamos
    const barColor = drawdownPct >= -5 ? 'var(--success)' : drawdownPct >= -15 ? '#eab308' : 'var(--danger)';

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            border: isSignificant ? '1px solid rgba(239,68,68,0.25)' : undefined,
        }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={16} color="var(--accent-color)" />
                Drawdown desde máximo
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Máximo histórico</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{formatCurrency(maxValue)}</div>
                    {maxDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            {new Date(maxDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    )}
                </div>

                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Caída actual</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: isAtMax ? 'var(--success)' : barColor }}>
                        {isAtMax ? 'En máximos' : `${drawdownPct.toFixed(1)}%`}
                    </div>
                    {!isAtMax && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            {formatCurrency(drawdownAbs)}
                        </div>
                    )}
                </div>

                {!isAtMax && recoveryNeededPct > 0 && (
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Para recuperar máximo</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#eab308' }}>
                            +{recoveryNeededPct.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            necesario desde hoy
                        </div>
                    </div>
                )}
            </div>

            {/* Barra visual del drawdown */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                    <span>0%</span>
                    <span>Valor actual: {((totalValue / maxValue) * 100).toFixed(1)}% del máximo</span>
                    <span>100% (máx.)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: barColor,
                        borderRadius: '5px',
                        transition: 'width 0.5s',
                    }} />
                </div>
            </div>
        </div>
    );
}
