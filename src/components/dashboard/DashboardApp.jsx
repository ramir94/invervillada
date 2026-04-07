import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, PieChart, BrainCircuit, ShieldAlert, TrendingUp, LogOut, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import Dashboard from './Dashboard'
import PortfolioTable from './PortfolioTable'
import AIAnalysis from './AIAnalysis'
import Simulator from './Simulator'
import Operations from './Operations'
import { getMarketData } from '../../services/marketData'
import { getOperations, buildHoldingsFromOperations, redeemMaturedBonds } from '../../services/operations'
import { calculateCostBasis, calculatePortfolioMetrics, calculateDrawdown, calculatePortfolioReturn } from '../../utils/analytics'
import { saveSnapshot, getSnapshots } from '../../services/snapshots'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Holdings', icon: PieChart },
    { id: 'operations', label: 'Operaciones', icon: ArrowLeftRight },
    { id: 'analysis', label: 'AI Analyst', icon: BrainCircuit },
    { id: 'simulator', label: 'Stress Test', icon: ShieldAlert },
]

// Ticker de la propia SICAV en BME (Bolsa de Madrid)
const SICAV_TICKER = '0P00011NA7'

export default function DashboardApp() {
    const { session, signOut } = useAuth()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [marketData, setMarketData] = useState(null)
    const [operations, setOperations] = useState([])
    const [snapshots, setSnapshots] = useState([])
    const [loading, setLoading] = useState(true)

    // Carga inicial: primero operaciones y snapshots, luego market data para los tickers del usuario
    useEffect(() => {
        const init = async () => {
            let [ops, snaps] = await Promise.all([getOperations(), getSnapshots()])

            // Redimir automáticamente bonos vencidos
            const maturedOps = await redeemMaturedBonds(ops)
            if (maturedOps.length > 0) ops = [...maturedOps, ...ops]

            setOperations(ops)
            setSnapshots(snaps)

            const tickerItems = [
                ...ops.map(op => ({ ticker: op.ticker, asset_type: op.asset_type ?? 'equity' })),
                { ticker: SICAV_TICKER, asset_type: 'equity' },
            ]
            const market = await getMarketData(tickerItems)
            setMarketData(market)
            setLoading(false)
        }
        init()
    }, [])

    // Lista de ticker items únicos actuales — cambia cuando el usuario añade/elimina operaciones
    const tickerItems = useMemo(() => {
        const seen = new Set()
        const items = []
        operations.forEach(op => {
            if (!seen.has(op.ticker)) {
                seen.add(op.ticker)
                items.push({ ticker: op.ticker, asset_type: op.asset_type ?? 'equity' })
            }
        })
        return items
    }, [operations])

    // Refrescar precios cada 30 segundos (tickers cartera + SICAV)
    useEffect(() => {
        if (!tickerItems.length) return
        const allItems = [...tickerItems, { ticker: SICAV_TICKER, asset_type: 'equity' }]
        const interval = setInterval(() => {
            getMarketData(allItems).then(data => {
                if (Object.keys(data).length > 0) setMarketData(data)
            })
        }, 30000)
        return () => clearInterval(interval)
    }, [tickerItems])

    const holdings = useMemo(() => buildHoldingsFromOperations(operations), [operations])
    const costBasis = useMemo(() => calculateCostBasis(operations), [operations])

    const analytics = useMemo(
        () => calculatePortfolioMetrics(holdings, marketData, costBasis),
        [holdings, marketData, costBasis]
    )

    const drawdown = useMemo(
        () => analytics ? calculateDrawdown(snapshots, analytics.totalValue) : null,
        [snapshots, analytics]
    )

    const portfolioReturn = useMemo(
        () => analytics ? calculatePortfolioReturn(snapshots, analytics.totalValue) : null,
        [snapshots, analytics]
    )

    // Guardar snapshot del día actual
    useEffect(() => {
        if (!analytics || analytics.totalValue <= 0) return
        saveSnapshot(analytics.totalValue).then(saved => {
            if (!saved) return
            setSnapshots(prev => {
                const today = new Date().toISOString().split('T')[0]
                const without = prev.filter(s => s.snapshot_date !== today)
                return [{ snapshot_date: today, total_value: analytics.totalValue }, ...without]
            })
        }).catch(() => { /* silenciar errores de snapshot */ })
    }, [analytics?.totalValue])

    const highAlertCount = analytics?.alerts.filter(a => a.severity === 'high').length ?? 0
    const totalAlertCount = analytics?.alerts.length ?? 0

    const handleOperationAdded = async (op) => {
        setOperations(prev => [op, ...prev])
        // Si es un ticker nuevo, obtener su precio inmediatamente
        if (!marketData || !marketData[op.ticker]) {
            const newData = await getMarketData([{ ticker: op.ticker, asset_type: op.asset_type ?? 'equity' }])
            if (Object.keys(newData).length > 0) {
                setMarketData(prev => ({ ...(prev ?? {}), ...newData }))
            }
        }
    }

    const handleOperationDeleted = (id) => {
        setOperations(prev => prev.filter(op => op.id !== id))
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
                Cargando datos...
            </div>
        )
    }

    return (
        <div className="app-container">
            {/* Bottom nav — mobile only */}
            <nav className="bottom-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`bottom-nav-item${activeTab === item.id ? ' active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                        style={{ position: 'relative' }}
                    >
                        <item.icon size={22} />
                        <span>{item.label}</span>
                        {item.id === 'dashboard' && highAlertCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '4px', right: '12px',
                                width: '8px', height: '8px',
                                background: 'var(--danger)',
                                borderRadius: '50%',
                            }} />
                        )}
                    </button>
                ))}
            </nav>

            <aside className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, height: '100vh', position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    <TrendingUp size={32} color="var(--accent-color)" />
                    <h1 style={{ fontSize: '1.25rem' }}>Invervillada</h1>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: activeTab === item.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                color: activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s',
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                            {item.id === 'dashboard' && highAlertCount > 0 && (
                                <span style={{
                                    marginLeft: 'auto',
                                    background: 'var(--danger)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '999px',
                                }}>
                                    {highAlertCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {analytics && (
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Health Score</small>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${analytics.healthScore.score}%`,
                                        background: analytics.healthScore.score >= 70 ? 'var(--success)' : analytics.healthScore.score >= 50 ? '#eab308' : 'var(--danger)',
                                        borderRadius: '3px',
                                        transition: 'width 0.5s',
                                    }} />
                                </div>
                                <span style={{
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    color: analytics.healthScore.score >= 70 ? 'var(--success)' : analytics.healthScore.score >= 50 ? '#eab308' : 'var(--danger)',
                                }}>
                                    {analytics.healthScore.score}
                                </span>
                            </div>
                            {totalAlertCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.77rem', color: highAlertCount > 0 ? 'var(--danger)' : '#eab308' }}>
                                    <AlertTriangle size={11} />
                                    {totalAlertCount} alerta{totalAlertCount > 1 ? 's' : ''} activa{totalAlertCount > 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <small style={{ color: 'var(--text-secondary)' }}>Posiciones activas</small>
                        <div style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{holdings.length} holdings</div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                            {session?.user?.email}
                        </small>
                        <button
                            onClick={signOut}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: 0,
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                {activeTab === 'dashboard' && <Dashboard analytics={analytics} drawdown={drawdown} portfolioReturn={portfolioReturn} sicavData={marketData?.[SICAV_TICKER] ?? null} snapshotCount={snapshots.length} />}
                {activeTab === 'portfolio' && <PortfolioTable analytics={analytics} />}
                {activeTab === 'operations' && (
                    <Operations
                        operations={operations}
                        analytics={analytics}
                        onOperationAdded={handleOperationAdded}
                        onOperationDeleted={handleOperationDeleted}
                    />
                )}
                {activeTab === 'analysis' && <AIAnalysis analytics={analytics} />}
                {activeTab === 'simulator' && <Simulator analytics={analytics} />}
            </main>
        </div>
    )
}
