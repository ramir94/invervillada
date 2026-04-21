import MonthlyReturnsWidget from './MonthlyReturnsWidget';
import { DrawdownWidget, BenchmarkWidget, SicavNavBar } from './dashboardHelpers';

export default function PerformanceTab({ analytics, drawdown, portfolioReturn, sicavData, monthlyReturns = null, snapshotCount = 0 }) {
    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin datos de portfolio. Registra tu primera operación.
            </div>
        );
    }

    const { totalValue } = analytics;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Performance</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Histórico de rentabilidad y comparativa frente a referencias de mercado.</p>
            </header>

            {/* Rentabilidad mensual — ancho completo */}
            <MonthlyReturnsWidget data={monthlyReturns} />

            {/* Benchmark comparison */}
            {portfolioReturn && (
                <BenchmarkWidget portfolioReturn={portfolioReturn} />
            )}

            {/* Drawdown Tracker + SICAV NAV — copia visual útil en Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: drawdown && sicavData?.price > 0 ? '1fr auto' : '1fr', gap: '1.5rem', alignItems: 'stretch' }}>
                {drawdown && (
                    <DrawdownWidget drawdown={drawdown} totalValue={totalValue} snapshotCount={snapshotCount} />
                )}
                {sicavData && sicavData.price > 0 && (
                    <SicavNavBar data={sicavData} />
                )}
            </div>
        </div>
    );
}
