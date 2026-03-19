import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency, formatPercent } from '../../utils/formatting';
import { ArrowUpRight, ArrowDownRight, Shield, Wallet, Activity } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard({ holdings, marketData }) {
    const stats = useMemo(() => {
        let totalValue = 0;
        let totalDailyChange = 0;
        let sectorMap = {};

        holdings.forEach(h => {
            const data = marketData[h.ticker];
            if (!data) return;

            const value = h.shares * ('price' in data ? data.price : 0);
            totalValue += value;
            totalDailyChange += h.shares * data.changeAmount;

            if (!sectorMap[h.sector]) sectorMap[h.sector] = 0;
            sectorMap[h.sector] += value;
        });

        return { totalValue, totalDailyChange, sectorMap };
    }, [holdings, marketData]);

    const chartData = {
        labels: Object.keys(stats.sectorMap),
        datasets: [
            {
                data: Object.values(stats.sectorMap),
                backgroundColor: [
                    '#38bdf8',
                    '#818cf8',
                    '#c084fc',
                    '#f472b6',
                    '#22c55e',
                    '#eab308',
                    '#f97316',
                ],
                borderColor: '#1e293b',
                borderWidth: 2,
            },
        ],
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header>
                <h2>Dashboard Overview</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Review your daily performance and asset allocation.</p>
            </header>

            <div className="dashboard-grid">
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem' }}>Net Worth</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                                {formatCurrency(stats.totalValue)}
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px' }}>
                            <Wallet color="var(--accent-color)" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem' }}>Daily P&L</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: stats.totalDailyChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {stats.totalDailyChange >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                {formatCurrency(Math.abs(stats.totalDailyChange))}
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: stats.totalDailyChange >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                            <Activity color={stats.totalDailyChange >= 0 ? 'var(--success)' : 'var(--danger)'} size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem' }}>Risk Profile</h3>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--success)' }}>
                                Conservative
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>High Wealth Protection</p>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                            <Shield color="var(--success)" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginTop: '1rem' }}>
                <h3>Sector Allocation</h3>
                <div style={{ height: '350px', display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <Doughnut
                        data={chartData}
                        options={{
                            plugins: {
                                legend: { position: 'right', labels: { color: '#94a3b8' } }
                            },
                            maintainAspectRatio: false
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
