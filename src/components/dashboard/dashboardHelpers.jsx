import { Fragment, useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { BENCHMARK_RETURNS } from '../../utils/analytics';
import { TrendingUp, TrendingDown, Info, BarChart2, Landmark } from 'lucide-react';

// Mapas de colores compartidos por varias tabs
export const FACTOR_LABELS = {
    growth: 'Crecimiento (Growth)',
    defensive: 'Defensivo',
    dividend: 'Dividendo / Value',
    cyclical: 'Cíclico',
    fixed_income: 'Renta Fija',
    cash: 'Liquidez',
    other: 'Otros',
};

export const RATING_COLORS = {
    'AAA': '#22c55e',
    'AA': '#4ade80',
    'A': '#38bdf8',
    'BBB': '#eab308',
    'BB': '#f97316',
    'B': '#ef4444',
    'NR': '#94a3b8',
};

export const MATURITY_COLORS = ['#38bdf8', '#818cf8', '#eab308', '#f97316'];

export const FACTOR_COLORS = {
    growth: '#818cf8',
    defensive: '#22c55e',
    dividend: '#38bdf8',
    cyclical: '#eab308',
    other: '#94a3b8',
};

export const CURRENCY_COLORS = {
    USD: '#38bdf8',
    EUR: '#818cf8',
    CHF: '#22c55e',
    GBP: '#f472b6',
    JPY: '#eab308',
    GBp: '#f472b6',
};

// Hook que devuelve las opciones del doughnut recalculadas al cambiar el viewport.
// Usa un listener de `resize` para actualizar la posición de la leyenda (bottom en móvil,
// right en desktop) sin requerir un reload.
export function useResponsiveDoughnutOptions() {
    const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;
    const [isMobile, setIsMobile] = useState(getIsMobile);

    useEffect(() => {
        const handleResize = () => setIsMobile(getIsMobile());
        window.addEventListener('resize', handleResize);
        // Sincronizar por si el estado inicial (SSR) difiere del actual
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        plugins: {
            legend: {
                position: isMobile ? 'bottom' : 'right',
                labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 },
            },
        },
        maintainAspectRatio: false,
    };
}

// Widget de drawdown — reutilizado en Overview y Performance
export function DrawdownWidget({ drawdown, totalValue, snapshotCount }) {
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

// Widget de comparación contra benchmark (S&P500, MSCI World)
export function BenchmarkWidget({ portfolioReturn }) {
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
                {/* Cabeceras */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>YTD</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>1 Año</div>
                {/* Filas */}
                {rows.map(row => (
                    <Fragment key={row.label}>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: row.isPortfolio ? '700' : '400',
                            color: row.isPortfolio ? 'var(--accent-color)' : 'var(--text-secondary)',
                        }}>
                            {row.label}
                        </div>
                        <ReturnCell value={row.ytd} isPortfolio={row.isPortfolio} />
                        <ReturnCell value={row['1y']} isPortfolio={row.isPortfolio} />
                    </Fragment>
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

// Barra lateral con el NAV actual de la propia SICAV
export function SicavNavBar({ data }) {
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
