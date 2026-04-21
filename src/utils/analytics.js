// Beta proxy por sector — estimaciones estándar de mercado
// Nombres de sector tal como aparecen en stockCatalog.js
const SECTOR_BETA = {
    'Technology': 1.30,
    'Health Care': 0.70,
    'Consumer Staples': 0.50,
    'Real Estate': 0.90,
    'Energy': 1.10,
    'Financials': 1.20,
    'Industrials': 1.00,
    'Consumer Discretionary': 1.20,
    'Utilities': 0.40,
    'Communication Services': 1.10,
    'Materials': 0.95,
};

const SECTOR_FACTOR = {
    'Technology': 'growth',
    'Consumer Discretionary': 'growth',
    'Communication Services': 'growth',
    'Health Care': 'defensive',
    'Consumer Staples': 'defensive',
    'Utilities': 'defensive',
    'Real Estate': 'dividend',
    'Energy': 'dividend',
    'Financials': 'dividend',
    'Industrials': 'cyclical',
    'Materials': 'cyclical',
    'ETF': 'other',
};

const INTERNATIONAL_TICKERS = new Set([
    'NESN', 'NOVN', 'SAP', 'SHEL', 'SIE', 'AIR', 'MC', 'OR', 'SAN',
    'BNP', 'ASML', 'RMS', 'TTE', 'BAS', 'BMW', 'DTE', 'RWE', 'VOW',
    'DB1', 'ALV', 'MUV2', 'IFX', 'ADS', 'BEI', 'CON',
]);

// Tipos de cambio a EUR (alineados con informe Singular Bank 17/04/2026).
// Convención: 1 unidad de la divisa listada equivale a FX_TO_EUR[divisa] euros.
const FX_TO_EUR = {
    EUR: 1,
    USD: 0.8500,
    CHF: 1.0873,
    DKK: 0.1338,
    GBP: 1.1489,
};

const toEur = (amount, currency) => amount * (FX_TO_EUR[currency] ?? 1);

// Retornos de referencia — datos mock actualizados a Q1 2026
// En producción reemplazar por API (Yahoo Finance, MSCI)
export const BENCHMARK_RETURNS = {
    SP500: { ytd: -2.1, '1y': 14.8, label: 'S&P 500' },
    MSCI_WORLD: { ytd: 1.3, '1y': 11.2, label: 'MSCI World' },
};

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

// Calcula distribución por clase de activo
export const calculateAssetAllocation = (positions) => {
    const totalValue = positions.reduce((s, p) => s + p.value, 0);
    if (totalValue === 0) return { equity: 0, bond: 0, cash: 0 };

    const groups = { equity: 0, bond: 0, cash: 0 };
    positions.forEach(p => {
        const type = p.asset_type ?? 'equity';
        if (type === 'bond' || type === 'bond_etf') {
            groups.bond += p.value;
        } else if (type === 'cash') {
            groups.cash += p.value;
        } else {
            groups.equity += p.value;
        }
    });

    return {
        equity: (groups.equity / totalValue) * 100,
        bond: (groups.bond / totalValue) * 100,
        cash: (groups.cash / totalValue) * 100,
    };
};

// Calcula métricas específicas de renta fija
export const calculateFixedIncomeMetrics = (positions) => {
    const bondPositions = positions.filter(p =>
        p.asset_type === 'bond' || p.asset_type === 'bond_etf'
    );
    if (bondPositions.length === 0) return null;

    const totalBondValue = bondPositions.reduce((s, p) => s + p.value, 0);
    if (totalBondValue === 0) return null;

    // Duración del portfolio: suma ponderada de duraciones individuales
    const portfolioDuration = bondPositions.reduce((s, p) => {
        const w = p.value / totalBondValue;
        return s + w * (p.duration ?? 0);
    }, 0);

    // TIR media ponderada en compra
    const weightedYTM = bondPositions.reduce((s, p) => {
        const w = p.value / totalBondValue;
        return s + w * (p.ytm_at_purchase ?? 0);
    }, 0);

    // Distribución por rating
    const ratingDistribution = {};
    bondPositions.forEach(p => {
        const r = p.rating ?? 'NR';
        ratingDistribution[r] = (ratingDistribution[r] ?? 0) + (p.value / totalBondValue) * 100;
    });

    // Distribución por vencimiento
    const now = new Date();
    const maturityDistribution = { '<1Y': 0, '1-3Y': 0, '3-5Y': 0, '>5Y': 0 };
    bondPositions.forEach(p => {
        const pct = (p.value / totalBondValue) * 100;
        if (!p.maturity_date) {
            maturityDistribution['1-3Y'] += pct;
            return;
        }
        const yearsToMaturity = (new Date(p.maturity_date) - now) / (1000 * 60 * 60 * 24 * 365.25);
        if (yearsToMaturity < 1) maturityDistribution['<1Y'] += pct;
        else if (yearsToMaturity < 3) maturityDistribution['1-3Y'] += pct;
        else if (yearsToMaturity < 5) maturityDistribution['3-5Y'] += pct;
        else maturityDistribution['>5Y'] += pct;
    });

    return {
        portfolioDuration,
        weightedYTM,
        ratingDistribution,
        maturityDistribution,
        totalBondValue,
        bondCount: bondPositions.length,
    };
};

// Calcula todas las métricas derivadas del portfolio
export const calculatePortfolioMetrics = (holdings, marketData, costBasis) => {
    if (!holdings.length || !marketData) return null;

    const positions = holdings.map(h => {
        const assetType = h.asset_type ?? 'equity';

        // ── LIQUIDEZ ──────────────────────────────────────────────────────────
        if (assetType === 'cash') {
            const nominal = Number(h.shares);
            return {
                ...h,
                currentPrice: 1.0,
                value: nominal,
                avgCost: 1.0,
                unrealizedPnL: 0,
                unrealizedPnLPct: 0,
                dailyChange: 0,
                dailyChangePct: 0,
                beta: 0,
                annualYield: 0,
                annualIncome: 0,
                factor: 'cash',
                isInternational: false,
                weight: 0,
                riskContribution: 0,
                contributionToReturn: 0,
            };
        }

        // ── BONO INDIVIDUAL ───────────────────────────────────────────────────
        if (assetType === 'bond') {
            const liveData = marketData[h.ticker];
            // Jerarquía: precio live (Yahoo Finance) → último guardado en DB → par (100)
            const marketPrice = liveData?.price ?? h.market_price ?? 100;
            const nominal = Number(h.shares);  // shares = nominal en divisa original
            // Valor en divisa del bono, convertido a EUR para agregaciones
            const valueLocal = nominal * marketPrice / 100;
            const value = toEur(valueLocal, h.currency);
            const acquisitionPrice = costBasis[h.ticker] ?? 100;
            const costValueLocal = nominal * acquisitionPrice / 100;
            const costValue = toEur(costValueLocal, h.currency);
            const unrealizedPnL = value - costValue;
            const unrealizedPnLPct = costValue > 0 ? (unrealizedPnL / costValue) * 100 : 0;
            const annualIncome = toEur(h.coupon_rate ? (h.coupon_rate / 100) * nominal : 0, h.currency);

            return {
                ...h,
                currentPrice: marketPrice,
                value,
                avgCost: acquisitionPrice,
                unrealizedPnL,
                unrealizedPnLPct,
                dailyChange: liveData ? (liveData.changePercent / 100) * value : 0,
                dailyChangePct: liveData?.changePercent ?? 0,
                beta: 0,
                annualYield: h.coupon_rate ?? 0,
                annualIncome,
                factor: 'fixed_income',
                isInternational: h.currency !== 'EUR',
                weight: 0,
                riskContribution: 0,
                contributionToReturn: 0,
            };
        }

        // ── EQUITY y ETF RF ───────────────────────────────────────────────────
        const data = marketData[h.ticker];
        if (!data) return null;
        const currentPrice = data.price;
        const avgCost = costBasis[h.ticker] ?? currentPrice;
        // Valor y PnL en EUR (convierte desde la divisa de cotización)
        const value = toEur(currentPrice * h.shares, h.currency);
        const unrealizedPnL = toEur((currentPrice - avgCost) * h.shares, h.currency);
        const unrealizedPnLPct = avgCost > 0 ? (currentPrice / avgCost - 1) * 100 : 0;
        const beta = assetType === 'bond_etf' ? 0.3 : estimateBeta(h.ticker, h.sector);
        const annualYield = data.yield ?? 0;
        const annualIncome = (annualYield / 100) * value;
        return {
            ...h,
            currentPrice,
            value,
            avgCost,
            unrealizedPnL,
            unrealizedPnLPct,
            dailyChange: toEur(data.changeAmount * h.shares, h.currency),
            dailyChangePct: data.changePercent,
            beta,
            annualYield,
            annualIncome,
            factor: assetType === 'bond_etf' ? 'fixed_income' : (SECTOR_FACTOR[h.sector] ?? 'other'),
            isInternational: h.currency !== 'EUR' || INTERNATIONAL_TICKERS.has(h.ticker),
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

    const totalAnnualIncome = positions.reduce((s, p) => s + p.annualIncome, 0);
    const portfolioYield = totalValue > 0 ? (totalAnnualIncome / totalValue) * 100 : 0;

    const currencyExposure = {};
    positions.forEach(p => {
        const ccy = p.currency ?? 'USD';
        currencyExposure[ccy] = (currencyExposure[ccy] ?? 0) + p.weight;
    });

    const sortedByWeight = [...positions].sort((a, b) => b.weight - a.weight);
    const top3Weight = sortedByWeight.slice(0, 3).reduce((s, p) => s + p.weight, 0);
    const top5Weight = sortedByWeight.slice(0, 5).reduce((s, p) => s + p.weight, 0);
    const top3 = sortedByWeight.slice(0, 3).map(p => ({ ticker: p.ticker, weight: p.weight }));

    // HHI: 0 = diversificación perfecta, 10000 = 1 activo
    const hhi = positions.reduce((s, p) => s + p.weight ** 2, 0);

    // Beta del portfolio: solo posiciones con beta != 0 (excluye bonos y cash)
    const portfolioBeta = positions.reduce((s, p) => s + (p.weight / 100) * p.beta, 0);

    const factorExposure = {};
    positions.forEach(p => {
        factorExposure[p.factor] = (factorExposure[p.factor] ?? 0) + p.weight;
    });

    const internationalWeight = positions
        .filter(p => p.isInternational)
        .reduce((s, p) => s + p.weight, 0);

    const assetAllocation = calculateAssetAllocation(positions);
    const fixedIncomeMetrics = calculateFixedIncomeMetrics(positions);

    const alerts = buildAlerts(positions, top3Weight, portfolioBeta, currencyExposure, fixedIncomeMetrics);
    const healthScore = computeHealthScore({ hhi, top3Weight, portfolioBeta, totalUnrealizedPnL, totalValue });

    const costBasisTotal = positions.reduce((s, p) => s + p.avgCost * p.shares, 0);

    return {
        positions,
        totalValue,
        totalDailyChange,
        totalDailyChangePct: totalValue > 0 ? (totalDailyChange / totalValue) * 100 : 0,
        totalUnrealizedPnL,
        totalUnrealizedPnLPct: costBasisTotal > 0 ? (totalUnrealizedPnL / costBasisTotal) * 100 : 0,
        totalAnnualIncome,
        portfolioYield,
        currencyExposure,
        top3Weight,
        top5Weight,
        top3,
        hhi,
        portfolioBeta,
        factorExposure,
        internationalWeight,
        alerts,
        healthScore,
        assetAllocation,
        fixedIncomeMetrics,
    };
};

const buildAlerts = (positions, top3Weight, portfolioBeta, currencyExposure = {}, fixedIncomeMetrics = null) => {
    const alerts = [];

    // Solo aplica overweight a equity (no tiene sentido para bonos individuales con nominal fijo)
    positions.filter(p => p.weight > 15 && (p.asset_type === 'equity' || !p.asset_type)).forEach(p => {
        alerts.push({
            type: 'overweight',
            severity: 'high',
            ticker: p.ticker,
            message: `${p.ticker} representa el ${p.weight.toFixed(1)}% del portfolio (límite: 15%)`,
            action: `Considera reducir la posición en ${p.ticker}`,
        });
    });

    positions.filter(p => p.unrealizedPnLPct < -15).forEach(p => {
        // Solo el bono individual se expresa como "% del nominal"; los ETF RF y las acciones
        // cotizan con precio absoluto y se presentan como pérdida sobre coste
        const isIndividualBond = p.asset_type === 'bond';
        const displayName = p.name ?? p.ticker;
        alerts.push({
            type: 'deterioration',
            severity: 'medium',
            ticker: p.ticker,
            name: displayName,
            asset_type: p.asset_type,
            message: isIndividualBond
                ? `${displayName} cotiza al ${p.currentPrice?.toFixed(1) ?? '—'}% del nominal — pérdida latente ${p.unrealizedPnLPct.toFixed(1)}%`
                : `${displayName} (${p.ticker}) acumula ${p.unrealizedPnLPct.toFixed(1)}% de pérdida sobre coste de compra`,
            action: isIndividualBond
                ? 'Evaluar riesgo crediticio del emisor — verificar si la caída refleja deterioro fundamental'
                : `Revisar tesis de inversión — confirmar si el deterioro es temporal o estructural`,
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

    const topCcyEntry = Object.entries(currencyExposure).sort((a, b) => b[1] - a[1])[0];
    if (topCcyEntry && topCcyEntry[1] > 80) {
        alerts.push({
            type: 'currency_concentration',
            severity: 'medium',
            ticker: null,
            message: `${topCcyEntry[1].toFixed(0)}% del portfolio en ${topCcyEntry[0]} — concentración de divisa elevada`,
            action: 'Considera añadir activos en otras divisas para reducir el riesgo de tipo de cambio',
        });
    }

    // ── Alertas de renta fija ─────────────────────────────────────────────────
    if (fixedIncomeMetrics) {
        const { portfolioDuration, ratingDistribution, maturityDistribution } = fixedIncomeMetrics;

        if (portfolioDuration > 5) {
            alerts.push({
                type: 'duration_risk',
                severity: 'medium',
                ticker: null,
                message: `Duración de la cartera RF: ${portfolioDuration.toFixed(2)} años — alta sensibilidad a subidas de tipos`,
                action: 'Considera reducir la duración con bonos a corto plazo o instrumentos a tipo variable',
            });
        }

        const lowRatingPct = (ratingDistribution['B'] ?? 0) + (ratingDistribution['BB'] ?? 0);
        if (lowRatingPct > 30) {
            alerts.push({
                type: 'credit_risk',
                severity: 'high',
                ticker: null,
                message: `${lowRatingPct.toFixed(0)}% de la RF en rating B/BB — riesgo crediticio elevado`,
                action: 'Aumenta la calidad crediticia de la cartera de renta fija',
            });
        }

        const maxBucketEntry = Object.entries(maturityDistribution).sort((a, b) => b[1] - a[1])[0];
        if (maxBucketEntry && maxBucketEntry[1] > 70) {
            alerts.push({
                type: 'maturity_concentration',
                severity: 'medium',
                ticker: null,
                message: `${maxBucketEntry[1].toFixed(0)}% de la RF vence en el bucket ${maxBucketEntry[0]} — concentración de vencimiento`,
                action: 'Distribuye los vencimientos para gestionar el riesgo de reinversión',
            });
        }
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

// Calcula retorno del portfolio vs snapshots históricos
export const calculatePortfolioReturn = (snapshots, currentValue) => {
    if (!snapshots || snapshots.length < 2) return { ytd: null, '1y': null };

    const now = new Date();
    const thisYear = now.getFullYear();
    const janFirst = `${thisYear}-01-01`;
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // Snapshot más reciente anterior al 1 de enero (para calcular YTD)
    const ytdSnap = snapshots
        .filter(s => s.snapshot_date < janFirst)
        .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0]
        ?? snapshots[snapshots.length - 1]; // fallback: snapshot más antiguo disponible

    // Snapshot más cercano a hace 365 días
    const oneYrSnap = snapshots
        .filter(s => s.snapshot_date <= oneYearAgoStr)
        .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];

    const ytd = ytdSnap && Number(ytdSnap.total_value) > 0
        ? (currentValue / Number(ytdSnap.total_value) - 1) * 100
        : null;

    const oneYear = oneYrSnap && Number(oneYrSnap.total_value) > 0
        ? (currentValue / Number(oneYrSnap.total_value) - 1) * 100
        : null;

    return { ytd, '1y': oneYear };
};

// Genera insights accionables basados en métricas reales
export const generateInsights = (metrics) => {
    if (!metrics) return { critical: [], warning: [], positive: [] };

    const {
        positions, top3Weight, portfolioBeta, factorExposure,
        internationalWeight, totalUnrealizedPnL, totalValue, hhi, alerts,
        currencyExposure, portfolioYield, totalAnnualIncome,
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

    // La diversificación geográfica se evalúa solo en equity (para una SICAV mixta el USD/EUR split es la métrica correcta)
    const equityPositions = positions.filter(p => (p.asset_type ?? 'equity') === 'equity');
    const equityValue = equityPositions.reduce((s, p) => s + p.value, 0);
    const domesticEquityPct = equityValue > 0
        ? equityPositions.filter(p => !p.isInternational).reduce((s, p) => s + p.value, 0) / equityValue * 100
        : 0;
    if (domesticEquityPct > 80 && equityPositions.length >= 4) {
        warning.push({
            title: `${domesticEquityPct.toFixed(0)}% de la RV en mercado doméstico — diversificación geográfica limitada en la cartera de acciones`,
            action: 'Considera exposición internacional para reducir riesgo de mercado local',
            ticker: null,
        });
    }

    // Yield bajo para perfil institucional
    if (portfolioYield !== undefined && portfolioYield < 1.0 && positions.length >= 3) {
        warning.push({
            title: `Yield del portfolio: ${portfolioYield.toFixed(1)}% — cartera sin ingreso significativo por dividendos`,
            action: 'Para un perfil institucional considera posiciones con yield >2% para generar flujo de caja estable',
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
        // RF: múltiples bonos en el mismo factor es normal para una SICAV con cartera mixta
        if (factor === 'fixed_income') return;
        if (tickers.length >= 3 && (factorExposure[factor] ?? 0) > 40) {
            warning.push({
                title: `${tickers.length} posiciones en el factor "${factor}" concentran el ${(factorExposure[factor] ?? 0).toFixed(0)}% del portfolio — correlación elevada`,
                action: 'Estos activos pueden moverse juntos ante el mismo shock de mercado',
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

    if (portfolioYield !== undefined && portfolioYield >= 2.5) {
        const incomeFormatted = totalAnnualIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
        positive.push({
            title: `Yield del portfolio: ${portfolioYield.toFixed(1)}% — ingreso anual estimado ${incomeFormatted}`,
            action: null,
        });
    }

    if (currencyExposure) {
        const currencies = Object.keys(currencyExposure).length;
        if (currencies >= 3) {
            positive.push({
                title: `Exposición en ${currencies} divisas distintas — diversificación de riesgo de cambio`,
                action: null,
            });
        }
    }

    return { critical, warning, positive };
};
