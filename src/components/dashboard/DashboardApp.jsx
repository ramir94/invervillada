import { useState, useEffect } from 'react'
import { LayoutDashboard, PieChart, BrainCircuit, ShieldAlert, TrendingUp, LogOut, ArrowLeftRight } from 'lucide-react'
import Dashboard from './Dashboard'
import PortfolioTable from './PortfolioTable'
import AIAnalysis from './AIAnalysis'
import Simulator from './Simulator'
import Operations from './Operations'
import { getMarketData } from '../../services/marketData'
import { getOperations, buildHoldingsFromOperations } from '../../services/operations'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Holdings', icon: PieChart },
    { id: 'operations', label: 'Operaciones', icon: ArrowLeftRight },
    { id: 'analysis', label: 'AI Analyst', icon: BrainCircuit },
    { id: 'simulator', label: 'Stress Test', icon: ShieldAlert },
]

export default function DashboardApp() {
    const { session, signOut } = useAuth()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [marketData, setMarketData] = useState(null)
    const [operations, setOperations] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([getMarketData(), getOperations()]).then(([market, ops]) => {
            setMarketData(market)
            setOperations(ops)
            setLoading(false)
        })

        const interval = setInterval(() => {
            getMarketData().then(data => setMarketData(data))
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    const holdings = buildHoldingsFromOperations(operations)

    const handleOperationAdded = (op) => {
        setOperations(prev => [op, ...prev])
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
                    >
                        <item.icon size={22} />
                        <span>{item.label}</span>
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
                                width: '100%'
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <small style={{ color: 'var(--text-secondary)' }}>Holdings activos</small>
                        <div style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{holdings.length} posiciones</div>
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
                {activeTab === 'dashboard' && <Dashboard holdings={holdings} marketData={marketData} />}
                {activeTab === 'portfolio' && <PortfolioTable holdings={holdings} marketData={marketData} />}
                {activeTab === 'operations' && (
                    <Operations
                        operations={operations}
                        onOperationAdded={handleOperationAdded}
                        onOperationDeleted={handleOperationDeleted}
                    />
                )}
                {activeTab === 'analysis' && <AIAnalysis holdings={holdings} marketData={marketData} />}
                {activeTab === 'simulator' && <Simulator holdings={holdings} marketData={marketData} />}
            </main>
        </div>
    )
}
