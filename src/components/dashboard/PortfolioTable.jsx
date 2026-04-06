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

const ASSET_FILTERS = [
    { id: 'all',   label: 'Todos' },
    { id: 'equity', label: 'Renta Variable' },
    { id: 'bond',  label: 'Renta Fija' },
    { id: 'cash',  label: 'Liquidez' },
];

const formatMaturity = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function PortfolioTable({ analytics }) {
    const [sortBy, setSortBy] = useState('weight');
    const [assetFilter, setAssetFilter] = useState('all');

    if (!analytics) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                Sin posiciones activas. Registra tu primera operación.
            </div>
        );
    }

    const { positions, alerts, totalValue, portfolioBeta } = analytics;

    const alertMap = {};
    alerts.forEach(a => {
        if (a.ticker) {
            if (!alertMap[a.ticker]) alertMap[a.ticker] = [];
            alertMap[a.ticker].push(a);
        }
    });

    const filtered = positions.filter(p => {
        if (assetFilter === 'all') return true;
        if (assetFilter === 'bond') return p.asset_type === 'bond' || p.asset_type === 'bond_etf';
        return (p.asset_type ?? 'equity') === assetFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'weight': return b.weight - a.weight;
            case 'risk': return b.riskContribution - a.riskContribution;
            case 'pnlPct': return b.unrealizedPnLPct - a.unrealizedPnLPct;
            case 'pnlAbs': return b.unrealizedPnL - a.unrealizedPnL;
            case 'yield': return b.annualYield - a.annualYield;
            case 'value': return b.value - a.value;
            default: return 0;
        }
    });

    const isBondView = assetFilter === 'bond';
    const isCashView = assetFilter === 'cash';

    const countByType = {
        equity: positions.filter(p => (p.asset_type ?? 'equity') === 'equity').length,
        bond: positions.filter(p => p.asset_type === 'bond' || p.asset_type === 'bond_etf').length,
        cash: positions.filter(p => p.asset_type === 'cash').length,
    };

    return (
        <div>
            <header style={{ marginBottom: '1.5rem' }}>
                <h2>Posiciones</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {positions.length} posiciones · Patrimonio: {formatCurrency(totalValue)} · Beta: {portfolioBeta.toFixed(2)}
                </p>
            </header>

            {/* Tabs de filtro por clase de activo */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {ASSET_FILTERS.map(f => {
                    const count = f.id === 'all' ? positions.length : f.id === 'bond' ? countByType.bond : countByType[f.id] ?? 0;
                    const isActive = assetFilter === f.id;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setAssetFilter(f.id)}
                            style={{
                                background: isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                border: isActive ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                                padding: '0.4rem 0.9rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: isActive ? '600' : '400',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.label}
                            {count > 0 && (
                                <span style={{
                                    marginLeft: '0.4rem',
                                    background: isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.08)',
                                    padding: '0.05rem 0.35rem',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem',
                                }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sort buttons — solo para vistas relevantes */}
            {!isCashView && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ordenar por:</span>
                    <SortButton id="weight" label="Peso %" current={sortBy} onClick={setSortBy} />
                    {!isBondView && <SortButton id="risk" label="Contribución riesgo" current={sortBy} onClick={setSortBy} />}
                    <SortButton id="pnlPct" label="P&L %" current={sortBy} onClick={setSortBy} />
                    <SortButton id="yield" label="Yield/Cupón" current={sortBy} onClick={setSortBy} />
                    <SortButton id="value" label="Valor" current={sortBy} onClick={setSortBy} />
                </div>
            )}

            <div className="glass-panel table-container">
                <table>
                    {/* ── Vista Renta Fija ── */}
                    {isBondView && (
                        <>
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
                                    // market_price del live data viene en currentPrice para bonds
                                    const marketPricePct = row.asset_type === 'bond'
                                        ? (row.currentPrice ?? 100)   // analytics pone currentPrice = marketPrice (%) para bonos
                                        : null;

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
                        </>
                    )}

                    {/* ── Vista Liquidez ── */}
                    {isCashView && (
                        <>
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th>Ticker</th>
                                    <th style={{ textAlign: 'right' }}>Importe</th>
                                    <th style={{ textAlign: 'right' }}>Peso %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(row => (
                                    <tr key={row.ticker}>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{row.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.sector}</div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--accent-color)' }}>
                                            {row.ticker}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(row.value)}</td>
                                        <td style={{ textAlign: 'right' }}>{row.weight.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </>
                    )}

                    {/* ── Vista Equity / Todos ── */}
                    {!isBondView && !isCashView && (
                        <>
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
                                    <th style={{ textAlign: 'right' }}>
                                        <span title="Yield anual estimado e ingreso por dividendos/cupones" style={{ cursor: 'help', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}>
                                            Yield / Ingreso
                                        </span>
                                    </th>
                                    <th style={{ textAlign: 'right' }}>Var. Hoy</th>
                                    {assetFilter === 'all' && <th style={{ textAlign: 'center' }}>Tipo</th>}
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
                                    const assetType = row.asset_type ?? 'equity';

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
                                            <td style={{ textAlign: 'right' }}>
                                                {row.annualYield > 0 ? (
                                                    <div>
                                                        <div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.88rem' }}>
                                                            {row.annualYield.toFixed(1)}%
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                            {formatCurrency(row.annualIncome)}/yr
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>—</span>
                                                )}
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
                                            {assetFilter === 'all' && (
                                                <td style={{ textAlign: 'center' }}>
                                                    {assetType === 'bond' && (
                                                        <span style={{ fontSize: '0.68rem', background: 'rgba(147,51,234,0.15)', color: '#a855f7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>RF</span>
                                                    )}
                                                    {assetType === 'bond_etf' && (
                                                        <span style={{ fontSize: '0.68rem', background: 'rgba(147,51,234,0.1)', color: '#a855f7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>ETF RF</span>
                                                    )}
                                                    {assetType === 'cash' && (
                                                        <span style={{ fontSize: '0.68rem', background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Cash</span>
                                                    )}
                                                </td>
                                            )}
                                            <td style={{ textAlign: 'center', width: '40px' }}>
                                                {hasHighAlert && (
                                                    <span title={rowAlerts.find(a => a.severity === 'high')?.message} style={{ cursor: 'help', display: 'inline-flex' }}>
                                                        <AlertTriangle size={15} color="var(--danger)" />
                                                    </span>
                                                )}
                                                {!hasHighAlert && hasMedAlert && (
                                                    <span title={rowAlerts.find(a => a.severity === 'medium')?.message} style={{ cursor: 'help', display: 'inline-flex' }}>
                                                        <AlertTriangle size={15} color="#eab308" />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </>
                    )}
                </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.77rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {isBondView
                    ? <span>* TIR compra = yield to maturity en el momento de adquisición · Duración = duración modificada en años</span>
                    : <span>* P&L Real = precio actual vs precio medio ponderado de compra · <AlertTriangle size={10} style={{ display: 'inline', color: 'var(--danger)' }} /> = sobrepeso {'>'} 15% / deterioro {'>'} -15%</span>
                }
            </div>
        </div>
    );
}
