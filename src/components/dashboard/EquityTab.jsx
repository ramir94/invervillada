import EquityTable from './EquityTable';

// Pestaña de Renta Variable: tabla completa de posiciones equity + ETFs de RV
export default function EquityTab({ analytics }) {
    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin datos de portfolio. Registra tu primera operación.
            </div>
        );
    }

    const equityPositions = analytics.positions.filter(p => (p.asset_type ?? 'equity') === 'equity');
    const equityValue = equityPositions.reduce((s, p) => s + p.value, 0);
    const equityPnL = equityPositions.reduce((s, p) => s + p.unrealizedPnL, 0);
    const equityCostBasis = equityValue - equityPnL;
    const equityPnLPct = equityCostBasis > 0 ? (equityPnL / equityCostBasis) * 100 : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Renta Variable</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {equityPositions.length} posiciones · Valor:{' '}
                    {equityValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    {' · '}P&L:{' '}
                    <span style={{ color: equityPnL >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {equityPnL >= 0 ? '+' : ''}
                        {equityPnL.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        {' '}({equityPnLPct >= 0 ? '+' : ''}{equityPnLPct.toFixed(1)}%)
                    </span>
                </p>
            </header>

            <EquityTable analytics={analytics} />
        </div>
    );
}
