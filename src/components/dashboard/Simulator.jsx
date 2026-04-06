import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { TrendingDown, RefreshCw, Clock, AlertTriangle, Sliders, Save, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { getScenarios, simulateScenario } from '../../utils/scenarios';
import { calculateRebalancingNeeds, estimateRebalancingCost, saveTargetWeights, loadTargetWeights } from '../../utils/rebalancing';

const ALL_SCENARIOS = getScenarios();

const SCENARIO_META = {
    crisis_2008:      { color: '#f43f5e', icon: TrendingDown },
    covid_2020:       { color: '#d946ef', icon: TrendingDown },
    tech_crash_2022:  { color: '#f97316', icon: TrendingDown },
    correction_10:    { color: '#eab308', icon: TrendingDown },
    rate_hike_100bp:  { color: '#38bdf8', icon: TrendingDown },
    credit_crisis:    { color: '#a855f7', icon: TrendingDown },
};

export default function Simulator({ analytics }) {
    const [activeTab, setActiveTab] = useState('stress');
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [result, setResult] = useState(null);

    // Rebalancing state
    const [targetWeights, setTargetWeights] = useState({});
    const [editingTargets, setEditingTargets] = useState(false);
    const [draftTargets, setDraftTargets] = useState({});

    useEffect(() => {
        setTargetWeights(loadTargetWeights());
    }, []);

    const runSimulation = (scenarioId) => {
        if (!analytics) return;
        setActiveScenarioId(scenarioId);
        setResult(simulateScenario(analytics.positions, scenarioId));
    };

    const resetStress = () => {
        setActiveScenarioId(null);
        setResult(null);
    };

    const startEditing = () => {
        const initial = {};
        (analytics?.positions ?? []).forEach(p => {
            initial[p.ticker] = targetWeights[p.ticker] ?? Math.round(p.weight * 10) / 10;
        });
        setDraftTargets(initial);
        setEditingTargets(true);
    };

    const saveTargets = () => {
        saveTargetWeights(draftTargets);
        setTargetWeights(draftTargets);
        setEditingTargets(false);
    };

    if (!analytics || !analytics.positions.length) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin posiciones activas para simular.
            </div>
        );
    }

    const currentTotal = analytics.totalValue;
    const hasTargets = Object.keys(targetWeights).length > 0;
    const rebalancingNeeds = hasTargets
        ? calculateRebalancingNeeds(analytics.positions, targetWeights, currentTotal)
        : [];
    const estimatedCost = estimateRebalancingCost(rebalancingNeeds);
    const inRangeCount = rebalancingNeeds.filter(n => n.actionType === 'hold').length;

    return (
        <div>
            <header style={{ marginBottom: '1.5rem' }}>
                <h2>Simulador</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Stress test con escenarios históricos y simulador de rebalanceo hacia objetivos.
                </p>
            </header>

            {/* Tab selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                {[
                    { id: 'stress', label: 'Stress Test' },
                    { id: 'rebalancing', label: 'Rebalanceo' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: activeTab === tab.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                            border: activeTab === tab.id ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
                            color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: activeTab === tab.id ? '600' : '400',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* STRESS TEST TAB */}
            {activeTab === 'stress' && (
                <>
                    {/* Selector de escenarios */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Selecciona un escenario</h3>
                        <div className="scenario-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
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
                                onClick={resetStress}
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

                            {/* Desglose por clase de activo */}
                            {result.impactByAssetClass && Object.keys(result.impactByAssetClass).length > 1 && (
                                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Impacto por clase de activo</h4>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {Object.entries(result.impactByAssetClass).map(([cls, data]) => {
                                            const label = cls === 'equity' ? 'Renta Variable' : cls === 'bond' ? 'Renta Fija' : 'Liquidez';
                                            const color = cls === 'equity' ? '#22c55e' : cls === 'bond' ? '#a855f7' : '#eab308';
                                            const shockPct = data.value > 0 ? (data.impact / data.value) * 100 : 0;
                                            return (
                                                <div key={cls} style={{
                                                    flex: '1 1 160px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${color}33`,
                                                    borderRadius: '8px',
                                                    padding: '0.9rem 1rem',
                                                }}>
                                                    <div style={{ fontSize: '0.78rem', color, fontWeight: '600', marginBottom: '0.4rem' }}>{label}</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: data.impact >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                        {data.impact >= 0 ? '+' : ''}{formatCurrency(data.impact)}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                                        {shockPct >= 0 ? '+' : ''}{shockPct.toFixed(1)}% · {formatCurrency(data.value)} expuesto
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                </>
            )}

            {/* REBALANCING TAB */}
            {activeTab === 'rebalancing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Panel de configuración de targets */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sliders size={16} color="var(--accent-color)" />
                                Objetivos de peso
                            </h3>
                            {!editingTargets ? (
                                <button
                                    onClick={startEditing}
                                    className="btn"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                                >
                                    <Sliders size={14} />
                                    {hasTargets ? 'Editar objetivos' : 'Configurar objetivos'}
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setEditingTargets(false)}
                                        style={{
                                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                            color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px',
                                            cursor: 'pointer', fontSize: '0.85rem',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveTargets}
                                        className="btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                                    >
                                        <Save size={14} />
                                        Guardar
                                    </button>
                                </div>
                            )}
                        </div>

                        {editingTargets ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    Define el peso objetivo (%) para cada posición. El rango ±2% se considera en equilibrio.
                                </p>
                                {analytics.positions.map(p => (
                                    <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--accent-color)', minWidth: '60px', fontSize: '0.9rem' }}>{p.ticker}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', minWidth: '80px' }}>
                                            Actual: {p.weight.toFixed(1)}%
                                        </span>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="40"
                                                step="0.5"
                                                value={draftTargets[p.ticker] ?? p.weight}
                                                onChange={e => setDraftTargets(prev => ({ ...prev, [p.ticker]: Number(e.target.value) }))}
                                                style={{ flex: 1, accentColor: 'var(--accent-color)' }}
                                            />
                                            <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {(draftTargets[p.ticker] ?? p.weight).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                                    Suma de objetivos: <span style={{ color: Object.values(draftTargets).reduce((s, v) => s + v, 0) > 105 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: '600' }}>
                                        {Object.values(draftTargets).reduce((s, v) => s + v, 0).toFixed(1)}%
                                    </span>
                                    {' '}(no necesita sumar 100% — las posiciones sin target se ignoran)
                                </div>
                            </div>
                        ) : !hasTargets ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                <Sliders size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                                <p style={{ fontSize: '0.9rem' }}>No has configurado objetivos de peso todavía.</p>
                                <p style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>Define el porcentaje objetivo de cada posición para ver qué operaciones necesitas.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {Object.entries(targetWeights).map(([ticker, target]) => (
                                    <div key={ticker} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                                        <span style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{ticker}</span> → {target.toFixed(1)}%
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tabla de desviaciones */}
                    {hasTargets && rebalancingNeeds.length > 0 && (
                        <>
                            {/* Resumen */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Posiciones en rango (±2%)</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: inRangeCount === rebalancingNeeds.length ? 'var(--success)' : 'var(--text-primary)' }}>
                                        {inRangeCount} / {rebalancingNeeds.length}
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Operaciones necesarias</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
                                        {rebalancingNeeds.filter(n => n.actionType !== 'hold').length}
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Coste estimado (0.1%)</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#eab308' }}>
                                        {formatCurrency(estimatedCost)}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1.25rem' }}>Plan de rebalanceo</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Ticker</th>
                                                <th style={{ textAlign: 'right' }}>Actual</th>
                                                <th style={{ textAlign: 'center' }}></th>
                                                <th style={{ textAlign: 'right' }}>Objetivo</th>
                                                <th style={{ textAlign: 'right' }}>Desviación</th>
                                                <th style={{ textAlign: 'right' }}>Acción</th>
                                                <th style={{ textAlign: 'right' }}>Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rebalancingNeeds.map(r => {
                                                const actionColor = r.actionType === 'buy' ? 'var(--success)' : r.actionType === 'sell' ? 'var(--danger)' : 'var(--text-secondary)';
                                                const ActionIcon = r.actionType === 'buy' ? TrendingUp : r.actionType === 'sell' ? TrendingDown : CheckCircle2;
                                                return (
                                                    <tr key={r.ticker}>
                                                        <td>
                                                            <div style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{r.ticker}</div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.sector}</div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{r.currentWeight.toFixed(1)}%</td>
                                                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            <ArrowRight size={14} />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{r.targetWeight.toFixed(1)}%</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <span style={{
                                                                color: Math.abs(r.deviation) <= 2 ? 'var(--text-secondary)' : r.deviation > 0 ? 'var(--danger)' : 'var(--success)',
                                                                fontWeight: Math.abs(r.deviation) > 2 ? '700' : '400',
                                                            }}>
                                                                {r.deviation > 0 ? '+' : ''}{r.deviation.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {r.actionType === 'hold' ? (
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                                                                    <CheckCircle2 size={13} color="var(--success)" /> En rango
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: actionColor, fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem', fontSize: '0.88rem' }}>
                                                                    <ActionIcon size={13} />
                                                                    {r.actionType === 'buy' ? 'Comprar' : 'Vender'} {Math.abs(r.sharesNeeded)} acc
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right', color: r.actionType === 'hold' ? 'var(--text-secondary)' : actionColor, fontSize: '0.85rem' }}>
                                                            {r.actionType !== 'hold' && (
                                                                <>{r.tradeValue > 0 ? '+' : ''}{formatCurrency(r.tradeValue)}</>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '0.75rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                                    * Coste de comisiones estimado al 0.1% por operación. Los precios son de mercado actual (datos mock). La acción recomendada asume ejecución al precio actual.
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
