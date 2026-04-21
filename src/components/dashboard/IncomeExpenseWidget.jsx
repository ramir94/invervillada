import { useState, useEffect } from 'react'
import { Receipt, ArrowDownRight, Coins, Banknote } from 'lucide-react'
import { formatCurrency } from '../../utils/formatting'
import { getIncomesSummary } from '../../services/incomes'
import { getExpensesSummary } from '../../services/expenses'

// Calcula 'YYYY-MM-DD' hoy y hace N días para los inputs date por defecto.
const isoDaysAgo = (days) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
}
const isoToday = () => new Date().toISOString().split('T')[0]

// Tarjeta individual del bloque de métricas (ingreso bruto / retenciones / gastos).
const SummaryCard = ({ icon: Icon, label, value, color, bg, details }) => (
    <div style={{
        padding: '1.1rem 1.25rem',
        background: bg,
        borderRadius: '10px',
        border: `1px solid ${color}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <Icon size={14} color={color} />
            {label}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '700', color }}>
            {formatCurrency(value)}
        </div>
        {details && details.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                {details.map((d, i) => (
                    <div key={i} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {d}
                    </div>
                ))}
            </div>
        )}
    </div>
)

export default function IncomeExpenseWidget({ incomesSummary: initialIncomes, expensesSummary: initialExpenses }) {
    // Estado inicial: rango de fechas usado por los summaries entrantes (o últimos 30 días)
    const [fromDate, setFromDate] = useState(initialIncomes?.fromIso ?? isoDaysAgo(30))
    const [toDate, setToDate] = useState(initialIncomes?.toIso ?? isoToday())
    const [incomes, setIncomes] = useState(initialIncomes)
    const [expenses, setExpenses] = useState(initialExpenses)
    const [loading, setLoading] = useState(false)

    // Al cambiar rango, recarga ambos resúmenes
    useEffect(() => {
        // Evita llamada doble en el montaje inicial cuando ya tenemos datos para ese rango
        const initialFrom = initialIncomes?.fromIso ?? isoDaysAgo(30)
        const initialTo = initialIncomes?.toIso ?? isoToday()
        if (fromDate === initialFrom && toDate === initialTo && initialIncomes && initialExpenses) return

        let cancelled = false
        setLoading(true)
        Promise.all([
            getIncomesSummary(fromDate, toDate).catch(() => null),
            getExpensesSummary(fromDate, toDate).catch(() => null),
        ]).then(([inc, exp]) => {
            if (cancelled) return
            setIncomes(inc)
            setExpenses(exp)
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [fromDate, toDate])

    const hasIncomes = incomes && (incomes.totalGross > 0 || incomes.totalWithholding > 0)
    const hasExpenses = expenses && expenses.totalInEur > 0
    const noData = !hasIncomes && !hasExpenses

    // Detalles para la tarjeta de ingresos brutos
    const couponAmount = incomes?.byType?.coupon ?? 0
    const interestAmount = incomes?.byType?.interest ?? 0
    const amortizationAmount = incomes?.byType?.amortization ?? 0
    const dividendAmount = incomes?.byType?.dividend ?? 0
    const otherIncomeAmount = incomes?.byType?.other ?? 0
    const couponsAndInterest = couponAmount + interestAmount

    const incomeDetails = []
    if (couponsAndInterest > 0) incomeDetails.push(`Cupones RF: ${formatCurrency(couponsAndInterest)}`)
    if (dividendAmount > 0) incomeDetails.push(`Dividendos: ${formatCurrency(dividendAmount)}`)
    if (amortizationAmount > 0) incomeDetails.push(`Amortizaciones: ${formatCurrency(amortizationAmount)}`)
    if (otherIncomeAmount > 0) incomeDetails.push(`Otros: ${formatCurrency(otherIncomeAmount)}`)

    // Detalles para la tarjeta de gastos
    const managementFee = expenses?.byType?.management_fee ?? 0
    const depositoryFee = expenses?.byType?.depository_fee ?? 0
    const fxExpense = expenses?.byType?.fx_expense ?? 0
    const runningCost = expenses?.byType?.running_cost ?? 0
    const otherExpense = expenses?.byType?.other ?? 0
    const feesTotal = managementFee + depositoryFee

    const expenseDetails = []
    if (feesTotal > 0) expenseDetails.push(`Gestión + depositaría: ${formatCurrency(feesTotal)}`)
    if (fxExpense > 0) expenseDetails.push(`FX: ${formatCurrency(fxExpense)}`)
    if (runningCost > 0) expenseDetails.push(`Otros gastos corrientes: ${formatCurrency(runningCost)}`)
    if (otherExpense > 0) expenseDetails.push(`Otros: ${formatCurrency(otherExpense)}`)

    // Neto del periodo = ingresos netos (tras retenciones) - gastos
    const netIncome = (incomes?.totalNet ?? 0) - (expenses?.totalInEur ?? 0)
    const netColor = netIncome >= 0 ? 'var(--success)' : 'var(--danger)'

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {/* Cabecera + filtros de fecha */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.25rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Receipt size={18} color="var(--accent-color)" />
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Ingresos y gastos del período</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Desde</span>
                    <input
                        type="date"
                        value={fromDate}
                        max={toDate}
                        onChange={e => setFromDate(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            colorScheme: 'dark',
                        }}
                    />
                    <span>hasta</span>
                    <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={e => setToDate(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            colorScheme: 'dark',
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                }}>
                    Cargando movimientos...
                </div>
            ) : noData ? (
                <div style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                }}>
                    Sin movimientos en el período.
                </div>
            ) : (
                <>
                    {/* Grid 3 columnas con cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1rem',
                    }}>
                        <SummaryCard
                            icon={Coins}
                            label="Cupones y dividendos cobrados (bruto)"
                            value={incomes?.totalGross ?? 0}
                            color="var(--success)"
                            bg="rgba(34,197,94,0.08)"
                            details={incomeDetails}
                        />
                        <SummaryCard
                            icon={ArrowDownRight}
                            label="Retenciones fiscales"
                            value={incomes?.totalWithholding ?? 0}
                            color="#eab308"
                            bg="rgba(234,179,8,0.08)"
                            details={null}
                        />
                        <SummaryCard
                            icon={Banknote}
                            label="Gastos del fondo"
                            value={expenses?.totalInEur ?? 0}
                            color="var(--danger)"
                            bg="rgba(239,68,68,0.08)"
                            details={expenseDetails}
                        />
                    </div>

                    {/* Línea final con el neto del período */}
                    <div style={{
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Neto del período (ingresos netos − gastos)
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: '700', color: netColor }}>
                            {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
