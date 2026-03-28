import { useState } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { ArrowUpDown, AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';

const SortButton = ({ id, label, current, onClick }) => (
    <button
        onClick={() => onClick(id)}
        style={{
            background: current === id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
            border: current === id ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: current === id ? 'var(--accent-color)' : 'var(--text-secondary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'all 0.2s',
        }}
    >
        <ArrowUpDown size={11} />
        {label}
    </button>
);

export default function PortfolioTable({ analytics }) {
    const [sortBy, setSortBy] = useState('weight');

    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin posiciones activas. Registra tu primera operación.
            </div>
        );
    }

    const { positions, alerts, totalValue, portfolioBeta } = analytics;

    // Mapa de alertas por ticker para mostrar en cada fila
    const alertMap = {};
    alerts.forEach(a => {
        if (a.ticker) {
            if (!alertMap[a.ticker]) alertMap[a.ticker] = [];
            alertMap[a.ticker].push(a);
        }
    });

    const sorted = [...positions].sort((a, b) => {
        switch (sortBy) {
            case 'weight': return b.weight - a.weight;
            case 'risk': return b.riskContribution - a.riskContribution;
            case 'pnlPct': return b.unrealizedPnLPct - a.unrealizedPnLPct;
            case 'pnlAbs': return b.unrealizedPnL - a.unrealizedPnL;
            case 'value': return b.value - a.value;
            default: return 0;
        }
    });

    return (
        <div>
            <header style={{ marginBottom: '1.5rem' }}>
                <h2>Posiciones</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {positions.length} posiciones · Patrimonio: {formatCurrency(totalValue)} · Beta: {portfolioBeta.toFixed(2)}
                </p>
            </header>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ordenar por:</span>
                <SortButton id="weight" label="Peso %" current={sortBy} onClick={setSortBy} />
                <SortButton id="risk" label="Contribución riesgo" current={sortBy} onClick={setSortBy} />
                <SortButton id="pnlPct" label="P&L %" current={sortBy} onClick={setSortBy} />
                <SortButton id="value" label="Valor" current={sortBy} onClick={setSortBy} />
            </div>

            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Empresa / Sector</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                            <th style={{ textAlign: 'right' }}>Precio</th>
                            <th style={{ textAlign: 'right' }}>Valor</th>
                            <th style={{ textAlign: 'right' }}>
                                <span title="Porcentaje del patrimonio total" style={{ cursor: 'help', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}>
                                    Peso %
                                </span>
                            </th>
                            <th style={{ textAlign: 'right' }}>
                                <span title="P&L no realizado sobre precio medio de compra" style={{ cursor: 'help', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}>
                                    P&L Real
                                </span>
                            </th>
                            <th style={{ textAlign: 'right' }}>P&L %</th>
                            <th style={{ textAlign: 'right' }}>Var. Hoy</th>
                            <th style={{ textAlign: 'center' }}>
                                <span title="Alertas activas para esta posición" style={{ cursor: 'help' }}>
                                    <Info size={13} style={{ opacity: 0.5 }} />
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(row => {
                            const rowAlerts = alertMap[row.ticker] ?? [];
                            const hasHighAlert = rowAlerts.some(a => a.severity === 'high');
                            const hasMedAlert = rowAlerts.some(a => a.severity === 'medium');
                            const isOverweight = row.weight > 15;
                            const isDeteriorating = row.unrealizedPnLPct < -15;

                            return (
                                <tr key={row.ticker} style={{ background: hasHighAlert ? 'rgba(239,68,68,0.03)' : undefined }}>
                                    <td>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '1rem' }}>
                                            {row.ticker}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem' }}>{row.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.sector}</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{Number(row.shares).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.currentPrice)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(row.value)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{
                                            color: isOverweight ? 'var(--danger)' : 'var(--text-primary)',
                                            fontWeight: isOverweight ? '700' : '400',
                                        }}>
                                            {row.weight.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: row.unrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                                        {row.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(row.unrealizedPnL)}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{
                                            color: row.unrealizedPnLPct >= 0 ? 'var(--success)' : 'var(--danger)',
                                            fontWeight: isDeteriorating ? '700' : '400',
                                        }}>
                                            {row.unrealizedPnLPct >= 0 ? '+' : ''}{row.unrealizedPnLPct.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: row.dailyChangePct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {row.dailyChangePct >= 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                                                <TrendingUp size={12} />
                                                {row.dailyChangePct.toFixed(2)}%
                                            </span>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                                                <TrendingDown size={12} />
                                                {Math.abs(row.dailyChangePct).toFixed(2)}%
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', width: '40px' }}>
                                        {hasHighAlert && (
                                            <span
                                                title={rowAlerts.find(a => a.severity === 'high')?.message}
                                                style={{ cursor: 'help', display: 'inline-flex' }}
                                            >
                                                <AlertTriangle size={15} color="var(--danger)" />
                                            </span>
                                        )}
                                        {!hasHighAlert && hasMedAlert && (
                                            <span
                                                title={rowAlerts.find(a => a.severity === 'medium')?.message}
                                                style={{ cursor: 'help', display: 'inline-flex' }}
                                            >
                                                <AlertTriangle size={15} color="#eab308" />
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.77rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>* P&L Real = precio actual vs precio medio ponderado de compra</span>
                <span>* Alerta <AlertTriangle size={10} style={{ display: 'inline', color: 'var(--danger)' }} /> = sobrepeso {'>'} 15% · <AlertTriangle size={10} style={{ display: 'inline', color: '#eab308' }} /> = deterioro {'>'} -15%</span>
            </div>
        </div>
    );
}
