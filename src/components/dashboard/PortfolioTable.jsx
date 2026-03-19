import { formatCurrency, formatPercent } from '../../utils/formatting';

export default function PortfolioTable({ holdings, marketData }) {
    const getRowData = (holding) => {
        const data = marketData[holding.ticker];
        if (!data) return null;
        return {
            ...holding,
            price: data.price,
            value: data.price * holding.shares,
            change: data.changePercent,
            risk: data.risk
        };
    };

    const rows = holdings.map(getRowData).filter(Boolean).sort((a, b) => b.value - a.value);

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Portfolio Holdings</h2>
            </header>

            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Company</th>
                            <th>Sector</th>
                            <th style={{ textAlign: 'right' }}>Shares</th>
                            <th style={{ textAlign: 'right' }}>Price</th>
                            <th style={{ textAlign: 'right' }}>Total Value</th>
                            <th style={{ textAlign: 'right' }}>24h Change</th>
                            <th style={{ textAlign: 'center' }}>Risk Profile</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.ticker}>
                                <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{row.ticker}</td>
                                <td>{row.name}</td>
                                <td>{row.sector}</td>
                                <td style={{ textAlign: 'right' }}>{row.shares.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(row.price)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(row.value)}</td>
                                <td style={{ textAlign: 'right', color: row.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {formatPercent(row.change)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={`badge ${row.risk.includes('Low') ? 'low' : row.risk.includes('High') ? 'high' : 'medium'}`}>
                                        {row.risk}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
