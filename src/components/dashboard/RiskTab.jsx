import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { AlertTriangle, Target, Info, Globe, Landmark } from 'lucide-react';
import GeoExposureWidget from './GeoExposureWidget';
import { FACTOR_LABELS, FACTOR_COLORS, CURRENCY_COLORS, useResponsiveDoughnutOptions } from './dashboardHelpers';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RiskTab({ analytics }) {
    // Hook responsive — debe llamarse antes de cualquier early return
    const doughnutOptions = useResponsiveDoughnutOptions();

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
                backgroundColor: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#22c55e', '#eab308', '#f97316', '#94a3b8'],
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
        top3Weight, top3, portfolioBeta,
        factorExposure, currencyExposure, alerts,
        assetAllocation, geoExposure,
    } = analytics;

    const hasGeoExposure = geoExposure && Object.values(geoExposure).some(v => v > 0.01);
    const hasMultipleAssetTypes = assetAllocation && [assetAllocation.equity, assetAllocation.bond, assetAllocation.cash].filter(v => v > 0.5).length > 1;

    const assetAllocationChartData = hasMultipleAssetTypes ? (() => {
        const labels = [], data = [], colors = [];
        if (assetAllocation.equity > 0.5) { labels.push('Renta Variable'); data.push(assetAllocation.equity); colors.push('#22c55e'); }
        if (assetAllocation.bond > 0.5) { labels.push('Renta Fija'); data.push(assetAllocation.bond); colors.push('#818cf8'); }
        if (assetAllocation.cash > 0.5) { labels.push('Liquidez'); data.push(assetAllocation.cash); colors.push('#eab308'); }
        return { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#1e293b', borderWidth: 2 }] };
    })() : null;

    const medAlerts = alerts.filter(a => a.severity === 'medium');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Riesgo</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Concentración, exposiciones por factor, divisa y distribución sectorial.</p>
            </header>

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

            {/* Distribución sectorial + geográfica RV — misma fila si cabe */}
            <div style={{ display: 'grid', gridTemplateColumns: hasGeoExposure ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.5rem' }}>
                {/* Sector doughnut */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.35rem' }}>Distribución por Sector</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Info size={12} />
                        La distribución sectorial puede ocultar correlaciones. Consulta la exposición por factor como referencia principal.
                    </p>
                    <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
                        {sectorChartData && (
                            <Doughnut data={sectorChartData} options={doughnutOptions} />
                        )}
                    </div>
                </div>

                {hasGeoExposure && <GeoExposureWidget geoExposure={geoExposure} />}
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
        </div>
    );
}
