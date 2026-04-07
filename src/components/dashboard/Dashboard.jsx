import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/formatting';
import { BENCHMARK_RETURNS } from '../../utils/analytics';
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Activity, Shield, Target, Info, BarChart2, DollarSign, Globe, Landmark } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const FACTOR_LABELS = {
    growth: 'Crecimiento (Growth)',
    defensive: 'Defensivo',
    dividend: 'Dividendo / Value',
    cyclical: 'Cíclico',
    fixed_income: 'Renta Fija',
    cash: 'Liquidez',
    other: 'Otros',
};

const RATING_COLORS = {
    'AAA': '#22c55e',
    'AA': '#4ade80',
    'A': '#38bdf8',
    'BBB': '#eab308',
    'BB': '#f97316',
    'B': '#ef4444',
    'NR': '#94a3b8',
};

const MATURITY_COLORS = ['#38bdf8', '#818cf8', '#eab308', '#f97316'];

const FACTOR_COLORS = {
    growth: '#818cf8',
    defensive: '#22c55e',
    dividend: '#38bdf8',
    cyclical: '#eab308',
    other: '#94a3b8',
};

const CURRENCY_COLORS = {
    USD: '#38bdf8',
    EUR: '#818cf8',
    CHF: '#22c55e',
    GBP: '#f472b6',
    JPY: '#eab308',
    GBp: '#f472b6',
};

export default function Dashboard({ analytics, drawdown, portfolioReturn, sicavData, snapshotCount = 0 }) {
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
        totalAnnualIncome, portfolioYield,
        top3Weight, top3, portfolioBeta,
        factorExposure, currencyExposure, healthScore, alerts, positions,
        assetAllocation, fixedIncomeMetrics,
    } = analytics;

    const hasMultipleAssetTypes = assetAllocation && [assetAllocation.equity, assetAllocation.bond, assetAllocation.cash].filter(v => v > 0.5).length > 1;

    const assetAllocationChartData = hasMultipleAssetTypes ? (() => {
        const labels = [], data = [], colors = [];
        if (assetAllocation.equity > 0.5) { labels.push('Renta Variable'); data.push(assetAllocation.equity); colors.push('#22c55e'); }
        if (assetAllocation.bond > 0.5) { labels.push('Renta Fija'); data.push(assetAllocation.bond); colors.push('#818cf8'); }
        if (assetAllocation.cash > 0.5) { labels.push('Liquidez'); data.push(assetAllocation.cash); colors.push('#eab308'); }
        return { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#1e293b', borderWidth: 2 }] };
    })() : null;

    const ratingChartData = fixedIncomeMetrics?.ratingDistribution ? (() => {
        const entries = Object.entries(fixedIncomeMetrics.ratingDistribution).filter(([, v]) => v > 0.1);
        return {
            labels: entries.map(([k]) => k),
            datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => RATING_COLORS[k] ?? '#94a3b8'), borderColor: '#1e293b', borderWidth: 2 }],
        };
    })() : null;

    const maturityChartData = fixedIncomeMetrics?.maturityDistribution ? (() => {
        const entries = Object.entries(fixedIncomeMetrics.maturityDistribution).filter(([, v]) => v > 0.1);
        return {
            labels: entries.map(([k]) => k),
            datasets: [{ data: entries.map(([, v]) => v), backgroundColor: MATURITY_COLORS.slice(0, entries.length), borderColor: '#1e293b', borderWidth: 2 }],
        };
    })() : null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const doughnutOptions = { plugins: { legend: { position: isMobile ? 'bottom' : 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } } }, maintainAspectRatio: false };

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

            {/* Drawdown Tracker + SICAV NAV — misma fila */}
            <div style={{ display: 'grid', gridTemplateColumns: drawdown && sicavData?.price > 0 ? '1fr auto' : '1fr', gap: '1.5rem', alignItems: 'stretch' }}>
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

            {/* Concentración + Factor Exposure + Currency Exposure */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>

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

                {/* Currency Exposure */}
                {currencyExposure && Object.keys(currencyExposure).length > 0 && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Globe size={16} color="var(--accent-color)" />
                            Exposición Divisa
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <Info size={12} />
                            Riesgo de tipo de cambio no cubierto
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {Object.entries(currencyExposure)
                                .sort((a, b) => b[1] - a[1])
                                .map(([ccy, weight]) => {
                                    const color = CURRENCY_COLORS[ccy] ?? '#94a3b8';
                                    const isHigh = weight > 80;
                                    return (
                                        <div key={ccy}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                                                    {ccy}
                                                    {isHigh && (
                                                        <span style={{ color: '#eab308', fontSize: '0.72rem' }}>{'⚠ >80%'}</span>
                                                    )}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isHigh ? '#eab308' : 'var(--text-primary)' }}>
                                                    {weight.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(100, weight)}%`,
                                                    background: color,
                                                    borderRadius: '4px',
                                                    transition: 'width 0.5s',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>

            {/* Distribución por clase de activo — solo si hay >1 tipo */}
            {hasMultipleAssetTypes && assetAllocationChartData && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={16} color="#818cf8" />
                        Distribución por Clase de Activo
                    </h3>
                    <div style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
                        <Doughnut data={assetAllocationChartData} options={doughnutOptions} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {[['Renta Variable', assetAllocation.equity, '#22c55e'], ['Renta Fija', assetAllocation.bond, '#818cf8'], ['Liquidez', assetAllocation.cash, '#eab308']].filter(([, v]) => v > 0.5).map(([label, value, color]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.83rem' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
                                <span style={{ color, fontWeight: '700' }}>{value.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sección de Renta Fija — solo si hay posiciones RF */}
            {fixedIncomeMetrics && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0' }}>
                        <Landmark size={18} color="#818cf8" />
                        Renta Fija
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                        {/* Rating */}
                        {ratingChartData && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.35rem', fontSize: '0.95rem' }}>Distribución por Rating</h3>
                                <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
                                    <Doughnut data={ratingChartData} options={doughnutOptions} />
                                </div>
                            </div>
                        )}
                        {/* Vencimiento */}
                        {maturityChartData && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.35rem', fontSize: '0.95rem' }}>Distribución por Vencimiento</h3>
                                <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
                                    <Doughnut data={maturityChartData} options={doughnutOptions} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                    legend: { position: isMobile ? 'bottom' : 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } }
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

function DrawdownWidget({ drawdown, totalValue, snapshotCount }) {
    const { maxValue, maxDate, drawdownPct, drawdownAbs, recoveryNeededPct } = drawdown;
    const isAtMax = drawdownPct >= -0.01;
    const isSignificant = drawdownPct < -5;
    const hasEnoughHistory = snapshotCount >= 5;

    const barWidth = isAtMax ? 100 : Math.max(0, 100 + drawdownPct);
    const barColor = drawdownPct >= -5 ? 'var(--success)' : drawdownPct >= -15 ? '#eab308' : 'var(--danger)';

    const daysSinceMax = maxDate && !isAtMax
        ? Math.round((new Date() - new Date(maxDate + 'T00:00:00')) / (1000 * 60 * 60 * 24))
        : null;

    // Sin historial suficiente, mostrar aviso en vez de datos engañosos
    if (!hasEnoughHistory) {
        return (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={16} color="var(--accent-color)" />
                    Drawdown desde máximo
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Info size={16} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Se necesitan al menos 5 días de datos para calcular el drawdown.
                            {' '}El sistema guarda un snapshot diario del valor del portfolio automáticamente.
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Snapshots registrados: <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{snapshotCount}</span> de 5 mínimos
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                            {daysSinceMax !== null && ` · hace ${daysSinceMax}d`}
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

function BenchmarkWidget({ portfolioReturn }) {
    const { ytd, '1y': oneYear } = portfolioReturn;

    const rows = [
        { label: 'Mi Cartera', ytd, '1y': oneYear, isPortfolio: true },
        { label: BENCHMARK_RETURNS.SP500.label, ytd: BENCHMARK_RETURNS.SP500.ytd, '1y': BENCHMARK_RETURNS.SP500['1y'], isPortfolio: false },
        { label: BENCHMARK_RETURNS.MSCI_WORLD.label, ytd: BENCHMARK_RETURNS.MSCI_WORLD.ytd, '1y': BENCHMARK_RETURNS.MSCI_WORLD['1y'], isPortfolio: false },
    ];

    const hasAnyData = ytd !== null || oneYear !== null;

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="var(--accent-color)" />
                Rendimiento vs Benchmark
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <Info size={12} />
                Benchmarks con datos de referencia estáticos · Datos de cartera calculados desde snapshots históricos
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem 1.5rem', alignItems: 'center' }}>
                {/* Headers */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>YTD</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>1 Año</div>
                {/* Rows */}
                {rows.map(row => (
                    <>
                        <div key={`${row.label}-label`} style={{
                            fontSize: '0.85rem',
                            fontWeight: row.isPortfolio ? '700' : '400',
                            color: row.isPortfolio ? 'var(--accent-color)' : 'var(--text-secondary)',
                        }}>
                            {row.label}
                        </div>
                        <ReturnCell key={`${row.label}-ytd`} value={row.ytd} isPortfolio={row.isPortfolio} />
                        <ReturnCell key={`${row.label}-1y`} value={row['1y']} isPortfolio={row.isPortfolio} />
                    </>
                ))}
            </div>
            {!hasAnyData && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    Se necesitan snapshots de fechas anteriores para calcular el rendimiento de la cartera.
                </p>
            )}
        </div>
    );
}

function ReturnCell({ value, isPortfolio }) {
    if (value === null || value === undefined) {
        return (
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>—</div>
        );
    }
    const color = value >= 0 ? 'var(--success)' : 'var(--danger)';
    return (
        <div style={{
            textAlign: 'right',
            fontSize: '0.85rem',
            fontWeight: isPortfolio ? '700' : '500',
            color,
        }}>
            {value >= 0 ? '+' : ''}{value.toFixed(1)}%
        </div>
    );
}

function SicavNavBar({ data }) {
    const { price, changePercent, changeAmount, high52w, low52w, currency } = data;
    const isUp = changePercent >= 0;
    const color = isUp ? 'var(--success)' : 'var(--danger)';
    const ccy = currency ?? 'EUR';

    const formatNav = (v) => v != null
        ? v.toLocaleString('es-ES', { style: 'currency', currency: ccy, minimumFractionDigits: 2 })
        : '—';

    // Corregir rango 52s con el precio actual (Yahoo puede reportar datos incorrectos para tickers ilíquidos)
    const realHigh = high52w != null ? Math.max(high52w, price) : null;
    const realLow = low52w != null ? Math.min(low52w, price) : null;
    const hasValidRange = realHigh != null && realLow != null && realHigh > realLow;

    const range52w = hasValidRange
        ? ((price - realLow) / (realHigh - realLow)) * 100
        : null;

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.75rem',
            minWidth: '200px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={16} color="var(--accent-color)" />
                <a href="https://www.cnmv.es/Portal/consultas/iic/sociedadiic?isin=ES0155476007" target="_blank" rel="noopener noreferrer" style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Invervillada SICAV</a>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatNav(price)}</div>

            <div style={{ color, fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {changeAmount != null && (isUp ? '+' : '') + changeAmount.toFixed(2)}
                {changePercent != null && ` (${isUp ? '+' : ''}${changePercent.toFixed(2)}%)`}
            </div>

            {hasValidRange && (
                <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                        <span>{formatNav(realLow)}</span>
                        <span style={{ fontSize: '0.68rem' }}>Rango 52 sem.</span>
                        <span>{formatNav(realHigh)}</span>
                    </div>
                    {range52w != null && (
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(100, Math.max(0, range52w))}%`,
                                background: range52w > 70 ? 'var(--success)' : range52w > 30 ? '#eab308' : 'var(--danger)',
                                borderRadius: '3px',
                            }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
