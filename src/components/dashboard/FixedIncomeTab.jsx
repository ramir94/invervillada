import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Landmark } from 'lucide-react';
import { RATING_COLORS, MATURITY_COLORS, getDoughnutOptions } from './dashboardHelpers';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FixedIncomeTab({ analytics }) {
    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin datos de portfolio. Registra tu primera operación.
            </div>
        );
    }

    const { fixedIncomeMetrics } = analytics;

    // Mensaje "sin posiciones RF" si no aplica
    if (!fixedIncomeMetrics) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <header>
                    <h2>Renta Fija</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Métricas específicas de la cartera de bonos.</p>
                </header>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Landmark size={32} color="#818cf8" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '0.95rem' }}>Sin posiciones de renta fija.</div>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>Esta pestaña mostrará las métricas RF cuando registres algún bono.</div>
                </div>
            </div>
        );
    }

    const ratingChartData = fixedIncomeMetrics.ratingDistribution ? (() => {
        const entries = Object.entries(fixedIncomeMetrics.ratingDistribution).filter(([, v]) => v > 0.1);
        return {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map(([k]) => RATING_COLORS[k] ?? '#94a3b8'),
                borderColor: '#1e293b',
                borderWidth: 2,
            }],
        };
    })() : null;

    const maturityChartData = fixedIncomeMetrics.maturityDistribution ? (() => {
        const entries = Object.entries(fixedIncomeMetrics.maturityDistribution).filter(([, v]) => v > 0.1);
        return {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: MATURITY_COLORS.slice(0, entries.length),
                borderColor: '#1e293b',
                borderWidth: 2,
            }],
        };
    })() : null;

    const doughnutOptions = getDoughnutOptions();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Renta Fija</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Duración, TIR, distribución de rating y vencimientos.</p>
            </header>

            {/* KPI Duración Portfolio RF */}
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

            {/* Distribución por rating + por vencimiento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {ratingChartData && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.35rem', fontSize: '0.95rem' }}>Distribución por Rating</h3>
                        <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={ratingChartData} options={doughnutOptions} />
                        </div>
                    </div>
                )}
                {maturityChartData && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.35rem', fontSize: '0.95rem' }}>Distribución por Vencimiento</h3>
                        <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={maturityChartData} options={doughnutOptions} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
