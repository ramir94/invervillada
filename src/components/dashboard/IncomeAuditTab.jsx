import IncomeExpenseWidget from './IncomeExpenseWidget';
import DerivativesExposureWidget from './DerivativesExposureWidget';

export default function IncomeAuditTab({ incomesSummary = null, expensesSummary = null, derivativesExposures = null }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <h2>Ingresos y Auditoría</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Ingresos y gastos del período y exposición a derivados.</p>
            </header>

            {/* Ingresos y gastos del período — auditoría */}
            <IncomeExpenseWidget incomesSummary={incomesSummary} expensesSummary={expensesSummary} />

            {/* Exposición a derivados — solo renderiza si hay filas */}
            <DerivativesExposureWidget exposures={derivativesExposures} />
        </div>
    );
}
