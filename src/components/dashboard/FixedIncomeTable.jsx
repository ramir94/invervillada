import { useState } from 'react';
import { formatCurrency } from '../../utils/formatting';
import { ArrowUpDown } from 'lucide-react';

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

const RATING_COLORS = {
    'AAA': { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    'AA':  { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    'A':   { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    'BBB': { bg: 'rgba(234,179,8,0.15)',  color: '#eab308' },
    'BB':  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
    'B':   { bg: 'rgba(239,68,68,0.2)',   color: '#ef4444' },
    'NR':  { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' },
};

const RatingBadge = ({ rating }) => {
    if (!rating) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>—</span>;
    const colors = RATING_COLORS[rating] ?? RATING_COLORS['NR'];
    return (
        <span style={{
            background: colors.bg,
            color: colors.color,
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.03em',
        }}>
            {rating}
        </span>
    );
};

const formatMaturity = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Tabla de posiciones de renta fija (bonos individuales + ETF RF + liquidez)
export default function FixedIncomeTable({ analytics }) {
    const [sortBy, setSortBy] = useState('weight');

    if (!analytics) return null;

    const { positions, alerts } = analytics;

    const alertMap = {};
    alerts.forEach(a => {
        if (a.ticker) {
            if (!alertMap[a.ticker]) alertMap[a.ticker] = [];
            alertMap[a.ticker].push(a);
        }
    });

    const filtered = positions.filter(p =>
        p.asset_type === 'bond' || p.asset_type === 'bond_etf' || p.asset_type === 'cash'
    );

    const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'weight': return b.weight - a.weight;
            case 'pnlPct': return b.unrealizedPnLPct - a.unrealizedPnLPct;
            case 'pnlAbs': return b.unrealizedPnL - a.unrealizedPnL;
            case 'yield':  return b.annualYield - a.annualYield;
            case 'value':  return b.value - a.value;
            default: return 0;
        }
    });

    if (filtered.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Sin posiciones de renta fija.
            </div>
        );
    }

    return (
        <div>
            {/* Sort buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ordenar por:</span>
                <SortButton id="weight" label="Peso %" current={sortBy} onClick={setSortBy} />
                <SortButton id="pnlPct" label="P&L %" current={sortBy} onClick={setSortBy} />
                <SortButton id="yield"  label="Cupón/Yield" current={sortBy} onClick={setSortBy} />
                <SortButton id="value"  label="Valor" current={sortBy} onClick={setSortBy} />
            </div>

            <div className="glass-panel table-container">
                <table style={{ minWidth: '1100px' }}>
                    <thead>
                        <tr>
                            <th>Nombre / Emisor</th>
                            <th>ISIN / Tipo</th>
                            <th style={{ textAlign: 'right' }}>Nominal</th>
                            <th style={{ textAlign: 'right' }}>Precio adq.%</th>
                            <th style={{ textAlign: 'right' }}>Precio mkt%</th>
                            <th style={{ textAlign: 'right' }}>Valor</th>
                            <th style={{ textAlign: 'right' }}>P&L €</th>
                            <th style={{ textAlign: 'right' }}>P&L %</th>
                            <th style={{ textAlign: 'center' }}>Rating</th>
                            <th style={{ textAlign: 'right' }}>Vencimiento</th>
                            <th style={{ textAlign: 'right' }}>Duración</th>
                            <th style={{ textAlign: 'right' }}>
                                <span title="TIR en el momento de compra" style={{ cursor: 'help', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}>
                                    TIR compra
                                </span>
                            </th>
                            <th style={{ textAlign: 'right' }}>Peso %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(row => {
                            const rowAlerts = alertMap[row.ticker] ?? [];
                            const hasHighAlert = rowAlerts.some(a => a.severity === 'high');
                            const isBondEtf = row.asset_type === 'bond_etf';
                            const isCash    = row.asset_type === 'cash';
                            // analytics expone currentPrice = marketPrice (%) para bonos individuales
                            const marketPricePct = row.asset_type === 'bond' ? (row.currentPrice ?? 100) : null;

                            return (
                                <tr key={row.ticker} style={{ background: hasHighAlert ? 'rgba(239,68,68,0.03)' : undefined }}>
                                    <td>
                                        <div style={{ fontSize: '0.88rem', fontWeight: '500' }}>{row.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.sector}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                                            {row.isin ?? row.ticker}
                                        </div>
                                        {isBondEtf && (
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>
                                                ETF RF
                                            </span>
                                        )}
                                        {isCash && (
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(234,179,8,0.1)', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>
                                                Liquidez
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {row.asset_type === 'bond'
                                            ? formatCurrency(row.shares)
                                            : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                        }
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {row.asset_type === 'bond'
                                            ? `${Number(row.avgCost).toFixed(2)}%`
                                            : formatCurrency(row.avgCost)
                                        }
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {marketPricePct !== null
                                            ? `${Number(marketPricePct).toFixed(2)}%`
                                            : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                        }
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(row.value)}</td>
                                    <td style={{ textAlign: 'right', color: row.unrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                                        {row.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(row.unrealizedPnL)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: row.unrealizedPnLPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {row.unrealizedPnLPct >= 0 ? '+' : ''}{row.unrealizedPnLPct.toFixed(1)}%
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <RatingBadge rating={row.rating} />
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                                        {formatMaturity(row.maturity_date)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                                        {row.duration != null ? `${Number(row.duration).toFixed(2)}a` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--success)', fontSize: '0.85rem' }}>
                                        {row.ytm_at_purchase != null ? `${(row.ytm_at_purchase * 100).toFixed(2)}%` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{row.weight.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                * TIR compra = yield to maturity en el momento de adquisición · Duración = duración modificada en años
            </div>
        </div>
    );
}
