import { useState } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { TrendingDown, TrendingUp, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { getScenarios, simulateScenario } from '../../utils/scenarios';

const ALL_SCENARIOS = getScenarios();

const SCENARIO_META = {
    crisis_2008: { color: '#f43f5e', icon: TrendingDown },
    covid_2020: { color: '#d946ef', icon: TrendingDown },
    tech_crash_2022: { color: '#f97316', icon: TrendingDown },
    correction_10: { color: '#eab308', icon: TrendingDown },
};

export default function Simulator({ analytics }) {
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [result, setResult] = useState(null);

    const runSimulation = (scenarioId) => {
        if (!analytics) return;
        setActiveScenarioId(scenarioId);
        setResult(simulateScenario(analytics.positions, scenarioId));
    };

    const reset = () => {
        setActiveScenarioId(null);
        setResult(null);
    };

    if (!analytics || !analytics.positions.length) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin posiciones activas para simular.
            </div>
        );
    }

    const currentTotal = analytics.totalValue;

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Stress Test</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Impacto por posición en escenarios históricos reales. Las correlaciones en crisis no son lineales.
                </p>
            </header>

            {/* Selector de escenarios */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Selecciona un escenario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(ALL_SCENARIOS).map(([id, scenario]) => {
                        const meta = SCENARIO_META[id] ?? { color: '#94a3b8', icon: TrendingDown };
                        const IconComp = meta.icon;
                        const isActive = activeScenarioId === id;
                        return (
                            <button
                                key={id}
                                onClick={() => runSimulation(id)}
                                style={{
                                    background: isActive ? `rgba(${meta.color === '#f43f5e' ? '244,63,94' : meta.color === '#d946ef' ? '217,70,239' : meta.color === '#f97316' ? '249,115,22' : '234,179,8'},0.1)` : 'rgba(255,255,255,0.03)',
                                    border: isActive ? `1px solid ${meta.color}` : '1px solid rgba(255,255,255,0.08)',
                                    padding: '1.25rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    color: 'white',
                                }}
                            >
                                <IconComp color={meta.color} size={22} style={{ marginBottom: '0.75rem' }} />
                                <div style={{ fontWeight: '700', marginBottom: '0.2rem', fontSize: '0.9rem' }}>{scenario.label}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{scenario.period}</div>
                                <div style={{ fontSize: '0.8rem', color: meta.color, fontWeight: '600' }}>
                                    Benchmark: {scenario.benchmarkPct > 0 ? '+' : ''}{scenario.benchmarkPct}%
                                </div>
                            </button>
                        );
                    })}
                </div>

                {result && (
                    <button
                        onClick={reset}
                        className="btn"
                        style={{ marginTop: '1.25rem', background: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={16} /> Limpiar simulación
                    </button>
                )}
            </div>

            {/* Resultados */}
            {result && (
                <>
                    {/* Resumen total */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Valor actual</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(currentTotal)}</div>
                        </div>
                        <div className="glass-panel" style={{
                            padding: '1.25rem',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                        }}>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Impacto estimado</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                                {formatCurrency(result.totalImpact)}
                            </div>
                            <div style={{ fontSize: '0.83rem', color: 'var(--danger)', marginTop: '0.15rem' }}>
                                {result.totalShockPct.toFixed(1)}% del portfolio
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Valor proyectado</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.totalProjected > currentTotal ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency(result.totalProjected)}
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={13} /> Recuperación histórica
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                ~{result.scenario.recoveryMonths}m
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>meses estimados</div>
                        </div>
                    </div>

                    {/* Descripción del escenario */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.85rem',
                        color: '#cbd5e1',
                        lineHeight: '1.6',
                    }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{result.scenario.label}:</strong>{' '}
                        {result.scenario.description}
                        {result.scenario.sectorShocks && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                Los shocks están diferenciados por sector, no lineales.
                            </span>
                        )}
                    </div>

                    {/* Impacto por posición */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} color="var(--danger)" />
                            Impacto por posición
                        </h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ticker</th>
                                        <th>Sector</th>
                                        <th style={{ textAlign: 'right' }}>Valor actual</th>
                                        <th style={{ textAlign: 'right' }}>Shock %</th>
                                        <th style={{ textAlign: 'right' }}>Impacto</th>
                                        <th style={{ textAlign: 'right' }}>Valor proyectado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.results.map(r => (
                                        <tr key={r.ticker}>
                                            <td>
                                                <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{r.ticker}</span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.sector}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(r.currentValue)}</td>
                                            <td style={{ textAlign: 'right', color: r.shockPct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                                                {r.shockPct >= 0 ? '+' : ''}{(r.shockPct * 100).toFixed(1)}%
                                            </td>
                                            <td style={{ textAlign: 'right', color: r.impact >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                                                {r.impact >= 0 ? '+' : ''}{formatCurrency(r.impact)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(r.projectedValue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                            * Shocks basados en datos históricos por sector. En crisis reales las correlaciones aumentan — la diversificación sectorial protege menos de lo esperado.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
