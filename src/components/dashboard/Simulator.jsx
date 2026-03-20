import { useState } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

export default function Simulator({ holdings, marketData }) {
    const [scenario, setScenario] = useState(null);

    const calculateTotal = () => {
        return holdings.reduce((sum, h) => {
            const price = marketData?.[h.ticker]?.price || 0;
            return sum + (price * h.shares);
        }, 0);
    };

    const currentTotal = calculateTotal();
    const [simulatedTotal, setSimulatedTotal] = useState(currentTotal);

    const scenarios = [
        {
            id: 'market_correction',
            label: 'Market Correction',
            desc: 'Broad market decline of 10%',
            effect: (val) => val * 0.90,
            icon: TrendingDown,
            color: '#f43f5e'
        },
        {
            id: 'tech_crash',
            label: 'Tech Crash',
            desc: 'Tech sector drops 20%, others stable',
            effect: (val) => val * 0.92,
            icon: TrendingDown,
            color: '#d946ef'
        },
        {
            id: 'bull_run',
            label: 'Bull Market',
            desc: 'Optimistic growth of 15%',
            effect: (val) => val * 1.15,
            icon: TrendingUp,
            color: '#22c55e'
        },
    ];

    const runSimulation = (s) => {
        setScenario(s);
        setSimulatedTotal(s.effect(currentTotal));
    };

    const reset = () => {
        setScenario(null);
        setSimulatedTotal(currentTotal);
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Portfolio Simulator</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Stress test your wealth composition against hypothetical market events.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(1fr, 1fr, 1fr) 350px', gap: '2rem' }}
                 className="simulator-grid">
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>Select a Scenario</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                        {scenarios.map(s => (
                            <button
                                key={s.id}
                                onClick={() => runSimulation(s)}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: scenario?.id === s.id ? `1px solid ${s.color}` : '1px solid transparent',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    color: 'white'
                                }}
                            >
                                <s.icon color={s.color} size={28} style={{ marginBottom: '1rem' }} />
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{s.label}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.desc}</div>
                            </button>
                        ))}
                    </div>

                    {scenario && (
                        <button onClick={reset} className="btn" style={{ marginTop: '2rem', background: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <RefreshCw size={16} /> Reset Simulation
                        </button>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ marginBottom: '2rem' }}>Impact Analysis</h3>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Current Value</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(currentTotal)}</div>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        background: scenario ? (simulatedTotal > currentTotal ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(255,255,255,0.03)',
                        border: scenario ? (simulatedTotal > currentTotal ? '1px solid var(--success)' : '1px solid var(--danger)') : 'none',
                        transition: 'all 0.3s'
                    }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Projected Value</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                            {formatCurrency(simulatedTotal)}
                        </div>
                        {scenario && (
                            <div style={{
                                marginTop: '0.5rem',
                                fontWeight: '600',
                                color: simulatedTotal > currentTotal ? 'var(--success)' : 'var(--danger)'
                            }}>
                                {simulatedTotal - currentTotal > 0 ? '+' : ''}{formatCurrency(simulatedTotal - currentTotal)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
