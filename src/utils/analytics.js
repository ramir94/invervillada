// Beta proxy por sector — estimaciones estándar de mercado
const SECTOR_BETA = {
    'Technology': 1.30,
    'Healthcare': 0.70,
    'Consumer Staples': 0.50,
    'Real Estate': 0.90,
    'Energy': 1.10,
    'Financials': 1.20,
    'Industrials': 1.00,
    'Consumer Discretionary': 1.20,
    'Utilities': 0.40,
    'Communication Services': 1.10,
    'Materials': 0.95,
    'Defense': 0.80,
};

const SECTOR_FACTOR = {
    'Technology': 'growth',
    'Consumer Discretionary': 'growth',
    'Communication Services': 'growth',
    'Healthcare': 'defensive',
    'Consumer Staples': 'defensive',
    'Utilities': 'defensive',
    'Defense': 'defensive',
    'Real Estate': 'dividend',
    'Energy': 'dividend',
    'Financials': 'dividend',
    'Industrials': 'cyclical',
    'Materials': 'cyclical',
};

const INTERNATIONAL_TICKERS = new Set([
    'NESN', 'NOVN', 'SAP', 'SHEL', 'SIE', 'AIR', 'MC', 'OR', 'SAN',
    'BNP', 'ASML', 'RMS', 'TTE', 'BAS', 'BMW', 'DTE', 'RWE', 'VOW',
    'DB1', 'ALV', 'MUV2', 'IFX', 'ADS', 'BEI', 'CON',
]);

export const estimateBeta = (ticker, sector) => SECTOR_BETA[sector] ?? 1.0;

// Calcula el precio medio ponderado de compra por ticker (weighted average cost)
export const calculateCostBasis = (operations) => {
    const basisMap = {};
    const sorted = [...operations].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(op => {
        if (!basisMap[op.ticker]) basisMap[op.ticker] = { shares: 0, totalCost: 0 };
        const entry = basisMap[op.ticker];
        const shares = Number(op.shares);
        const price = Number(op.price);

        if (op.type === 'buy') {
            entry.totalCost += shares * price;
            entry.shares += shares;
        } else if (entry.shares > 0) {
            // Reduce coste proporcionalmente (precio medio)
            const avgCost = entry.totalCost / entry.shares;
            entry.totalCost -= shares * avgCost;
            entry.shares -= shares;
        }
    });

    const result = {};
    Object.entries(basisMap).forEach(([ticker, { shares, totalCost }]) => {
        if (shares > 0) result[ticker] = totalCost / shares;
    });
    return result;
};

// Calcula todas las métricas derivadas del portfolio
export const calculatePortfolioMetrics = (holdings, marketData, costBasis) => {
    if (!holdings.length || !marketData) return null;

    const positions = holdings.map(h => {
        const data = marketData[h.ticker];
        if (!data) return null;
        const currentPrice = data.price;
        const value = currentPrice * h.shares;
        const avgCost = costBasis[h.ticker] ?? currentPrice;
        const unrealizedPnL = (currentPrice - avgCost) * h.shares;
        const unrealizedPnLPct = avgCost > 0 ? (currentPrice / avgCost - 1) * 100 : 0;
        const beta = estimateBeta(h.ticker, h.sector);
        return {
            ...h,
            currentPrice,
            value,
            avgCost,
            unrealizedPnL,
            unrealizedPnLPct,
            dailyChange: data.changeAmount * h.shares,
            dailyChangePct: data.changePercent,
            beta,
            factor: SECTOR_FACTOR[h.sector] ?? 'other',
            isInternational: INTERNATIONAL_TICKERS.has(h.ticker),
            weight: 0,
            riskContribution: 0,
            contributionToReturn: 0,
        };
    }).filter(Boolean);

    const totalValue = positions.reduce((s, p) => s + p.value, 0);
    const totalDailyChange = positions.reduce((s, p) => s + p.dailyChange, 0);
    const totalUnrealizedPnL = positions.reduce((s, p) => s + p.unrealizedPnL, 0);

    positions.forEach(p => {
        p.weight = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
        p.riskContribution = p.weight * p.beta;
        p.contributionToReturn = totalDailyChange !== 0 ? (p.dailyChange / totalDailyChange) * 100 : 0;
    });

    const sortedByWeight = [...positions].sort((a, b) => b.weight - a.weight);
    const top3Weight = sortedByWeight.slice(0, 3).reduce((s, p) => s + p.weight, 0);
    const top5Weight = sortedByWeight.slice(0, 5).reduce((s, p) => s + p.weight, 0);
    const top3 = sortedByWeight.slice(0, 3).map(p => ({ ticker: p.ticker, weight: p.weight }));

    // HHI: 0 = diversificación perfecta, 10000 = 1 activo
    const hhi = positions.reduce((s, p) => s + p.weight ** 2, 0);

    const portfolioBeta = positions.reduce((s, p) => s + (p.weight / 100) * p.beta, 0);

    const factorExposure = {};
    positions.forEach(p => {
        factorExposure[p.factor] = (factorExposure[p.factor] ?? 0) + p.weight;
    });

    const internationalWeight = positions
        .filter(p => p.isInternational)
        .reduce((s, p) => s + p.weight, 0);

    const alerts = buildAlerts(positions, top3Weight, portfolioBeta);
    const healthScore = computeHealthScore({ hhi, top3Weight, portfolioBeta, totalUnrealizedPnL, totalValue });

    const costBasisTotal = positions.reduce((s, p) => s + p.avgCost * p.shares, 0);

    return {
        positions,
        totalValue,
        totalDailyChange,
        totalDailyChangePct: totalValue > 0 ? (totalDailyChange / totalValue) * 100 : 0,
        totalUnrealizedPnL,
        totalUnrealizedPnLPct: costBasisTotal > 0 ? (totalUnrealizedPnL / costBasisTotal) * 100 : 0,
        top3Weight,
        top5Weight,
        top3,
        hhi,
        portfolioBeta,
        factorExposure,
        internationalWeight,
        alerts,
        healthScore,
    };
};

const buildAlerts = (positions, top3Weight, portfolioBeta) => {
    const alerts = [];

    positions.filter(p => p.weight > 15).forEach(p => {
        alerts.push({
            type: 'overweight',
            severity: 'high',
            ticker: p.ticker,
            message: `${p.ticker} representa el ${p.weight.toFixed(1)}% del portfolio (límite: 15%)`,
            action: `Considera reducir la posición en ${p.ticker}`,
        });
    });

    positions.filter(p => p.unrealizedPnLPct < -15).forEach(p => {
        alerts.push({
            type: 'deterioration',
            severity: 'medium',
            ticker: p.ticker,
            message: `${p.ticker} acumula ${p.unrealizedPnLPct.toFixed(1)}% de pérdida sobre coste de compra`,
            action: `Revisa la tesis de inversión de ${p.ticker}`,
        });
    });

    if (top3Weight > 60) {
        alerts.push({
            type: 'concentration',
            severity: top3Weight > 70 ? 'high' : 'medium',
            ticker: null,
            message: `Top 3 posiciones concentran el ${top3Weight.toFixed(1)}% del portfolio`,
            action: 'Considera diversificar o reducir las posiciones principales',
        });
    }

    if (portfolioBeta > 1.2) {
        alerts.push({
            type: 'high_beta',
            severity: 'medium',
            ticker: null,
            message: `Beta del portfolio: ${portfolioBeta.toFixed(2)} — alta sensibilidad a caídas de mercado`,
            action: 'Añade activos defensivos (utilities, consumer staples) para reducir la beta',
        });
    }

    return alerts;
};

const computeHealthScore = ({ hhi, top3Weight, portfolioBeta, totalUnrealizedPnL, totalValue }) => {
    // 0 = perfecta diversificación (HHI<500), penalizar progresivamente
    const diversificationScore = Math.max(0, Math.min(100, 100 - ((hhi - 500) / 2500) * 100));

    // 100 si top3 < 30%, 0 si top3 > 70%
    const concentrationScore = Math.max(0, Math.min(100, 100 - ((top3Weight - 30) / 40) * 100));

    // Óptimo: beta 0.7-1.0; penalizar por exceso de beta
    const betaScore = portfolioBeta <= 1.0
        ? Math.min(100, 100 - Math.abs(portfolioBeta - 0.85) * 60)
        : Math.max(0, 100 - (portfolioBeta - 1.0) * 100);

    // Leve bonus/penalización por P&L total
    const pnlScore = totalValue > 0
        ? Math.min(100, Math.max(0, 50 + (totalUnrealizedPnL / totalValue) * 200))
        : 50;

    const score = Math.round(
        diversificationScore * 0.35 +
        concentrationScore * 0.30 +
        betaScore * 0.25 +
        pnlScore * 0.10
    );

    return {
        score: Math.min(100, Math.max(0, score)),
        breakdown: {
            diversification: Math.round(diversificationScore),
            concentration: Math.round(concentrationScore),
            beta: Math.round(betaScore),
            pnl: Math.round(pnlScore),
        },
    };
};

// Calcula drawdown actual y máximo histórico desde los snapshots
export const calculateDrawdown = (snapshots, currentValue) => {
    // snapshots viene ordenado desc (más reciente primero)
    if (!snapshots || snapshots.length === 0) {
        return { maxValue: currentValue, maxDate: null, drawdownPct: 0, drawdownAbs: 0, recoveryNeededPct: 0 }
    }

    // Incluir el valor actual como referencia del día de hoy
    const allValues = [
        { snapshot_date: new Date().toISOString().split('T')[0], total_value: currentValue },
        ...snapshots,
    ]

    let maxValue = 0
    let maxDate = null
    allValues.forEach(s => {
        const v = Number(s.total_value)
        if (v > maxValue) {
            maxValue = v
            maxDate = s.snapshot_date
        }
    })

    const drawdownAbs = currentValue - maxValue
    const drawdownPct = maxValue > 0 ? (drawdownAbs / maxValue) * 100 : 0
    // Para recuperar el máximo desde el valor actual: (maxValue/currentValue - 1) * 100
    const recoveryNeededPct = currentValue > 0 && drawdownPct < 0
        ? (maxValue / currentValue - 1) * 100
        : 0

    return { maxValue, maxDate, drawdownPct, drawdownAbs, recoveryNeededPct }
}

// Genera insights accionables basados en métricas reales
export const generateInsights = (metrics) => {
    if (!metrics) return { critical: [], warning: [], positive: [] };

    const {
        positions, top3Weight, portfolioBeta, factorExposure,
        internationalWeight, totalUnrealizedPnL, totalValue, hhi, alerts,
    } = metrics;

    const critical = [];
    const warning = [];
    const positive = [];

    alerts.filter(a => a.severity === 'high').forEach(a => {
        critical.push({ title: a.message, action: a.action, ticker: a.ticker });
    });

    alerts.filter(a => a.severity === 'medium').forEach(a => {
        warning.push({ title: a.message, action: a.action, ticker: a.ticker });
    });

    const growthExposure = factorExposure.growth ?? 0;
    if (growthExposure > 50) {
        warning.push({
            title: `${growthExposure.toFixed(0)}% del portfolio en activos growth — alta sensibilidad a subidas de tipos de interés`,
            action: 'Equilibra con activos de dividendo o defensivos para reducir la duración implícita',
            ticker: null,
        });
    }

    if (internationalWeight < 15 && positions.length >= 4) {
        warning.push({
            title: `Solo el ${internationalWeight.toFixed(0)}% del portfolio está en activos internacionales — concentración en un solo mercado`,
            action: 'Considera diversificación geográfica: mercados europeos, asiáticos o globales',
            ticker: null,
        });
    }

    // Detectar posibles correlaciones ocultas: múltiples activos del mismo factor
    const factorGroups = {};
    positions.forEach(p => {
        if (!factorGroups[p.factor]) factorGroups[p.factor] = [];
        factorGroups[p.factor].push(p.ticker);
    });
    Object.entries(factorGroups).forEach(([factor, tickers]) => {
        if (tickers.length >= 3 && (factorExposure[factor] ?? 0) > 40) {
            warning.push({
                title: `${tickers.length} posiciones en el mismo factor (${factor}): ${tickers.join(', ')} — concentración de factor oculta`,
                action: 'Aunque están en sectores distintos, pueden moverse juntas ante el mismo shock de mercado',
                ticker: null,
            });
        }
    });

    if (totalUnrealizedPnL > 0 && totalValue > 0) {
        const costBasisTotal = totalValue - totalUnrealizedPnL;
        const pct = costBasisTotal > 0 ? (totalUnrealizedPnL / costBasisTotal) * 100 : 0;
        positive.push({
            title: `Portfolio en positivo: +${pct.toFixed(1)}% sobre coste de adquisición`,
            action: null,
        });
    }

    if (hhi < 1000 && positions.length >= 5) {
        positive.push({
            title: `Buena distribución entre posiciones (HHI: ${Math.round(hhi)}) — sin dominio excesivo de ningún activo`,
            action: null,
        });
    }

    if (portfolioBeta < 0.8) {
        positive.push({
            title: `Beta del portfolio ${portfolioBeta.toFixed(2)} — cartera de baja volatilidad relativa al mercado`,
            action: null,
        });
    }

    if (internationalWeight >= 25) {
        positive.push({
            title: `${internationalWeight.toFixed(0)}% en activos internacionales — diversificación geográfica sólida`,
            action: null,
        });
    }

    return { critical, warning, positive };
};
