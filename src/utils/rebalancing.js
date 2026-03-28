const STORAGE_KEY = 'invervillada_target_weights';

export const saveTargetWeights = (targets) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
};

export const loadTargetWeights = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

// Calcula las operaciones necesarias para rebalancear al target
// positions: array de posiciones con { ticker, weight, currentPrice, shares, value }
// targetWeights: { [ticker]: targetPct } (% del portfolio total)
// totalValue: valor total del portfolio
export const calculateRebalancingNeeds = (positions, targetWeights, totalValue) => {
    if (!positions.length || !totalValue) return [];

    return positions
        .map(p => {
            const targetWeight = targetWeights[p.ticker] ?? null;
            if (targetWeight === null) return null;

            const deviation = p.weight - targetWeight;
            const targetValue = (targetWeight / 100) * totalValue;
            const currentValue = p.value;
            const valueDiff = targetValue - currentValue; // positivo = comprar, negativo = vender

            const sharesNeeded = p.currentPrice > 0
                ? Math.round(valueDiff / p.currentPrice)
                : 0;

            const actionType = Math.abs(deviation) <= 2
                ? 'hold'
                : deviation > 0
                    ? 'sell'
                    : 'buy';

            return {
                ticker: p.ticker,
                name: p.name,
                sector: p.sector,
                currentWeight: p.weight,
                targetWeight,
                deviation,
                actionType,
                sharesNeeded,
                tradeValue: valueDiff,
                currentPrice: p.currentPrice,
                currentShares: p.shares,
            };
        })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
};

// Calcula el coste estimado de comisiones del rebalanceo (asume 0.1% por operación)
export const estimateRebalancingCost = (needs, commissionRate = 0.001) => {
    return needs
        .filter(n => n.actionType !== 'hold')
        .reduce((sum, n) => sum + Math.abs(n.tradeValue) * commissionRate, 0);
};
