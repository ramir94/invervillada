// Choques históricos por sector — basados en datos reales de cada crisis
const SCENARIO_DEFINITIONS = {
    crisis_2008: {
        label: 'Crisis Financiera 2008',
        period: 'Oct 2007 – Mar 2009',
        benchmarkPct: -56,
        recoveryMonths: 51,
        description: 'Colapso del sistema financiero global. S&P 500 -56%. Correlaciones se dispararon: incluso activos "seguros" cayeron.',
        sectorShocks: {
            'Technology': -0.48,
            'Healthcare': -0.25,
            'Consumer Staples': -0.18,
            'Real Estate': -0.62,
            'Energy': -0.42,
            'Financials': -0.65,
            'Industrials': -0.44,
            'Consumer Discretionary': -0.52,
            'Utilities': -0.28,
            'Communication Services': -0.38,
            'Materials': -0.50,
            'Defense': -0.20,
            default: -0.40,
        },
        // Bonos: en 2008 la RF de alta calidad actuó como refugio; crédito corporativo sufrió
        fixedIncomeRatingShocks: { 'AAA': +0.02, 'AA': +0.01, 'A': -0.03, 'BBB': -0.10, 'BB': -0.25, 'B': -0.40, 'NR': -0.15 },
    },
    covid_2020: {
        label: 'COVID Crash 2020',
        period: 'Feb – Mar 2020',
        benchmarkPct: -34,
        recoveryMonths: 6,
        description: 'Pandemia global. Caída del 34% en 33 días. Recuperación en forma de V en 6 meses. Tech y salud salieron mejor parados.',
        sectorShocks: {
            'Technology': +0.05,
            'Healthcare': +0.03,
            'Consumer Staples': -0.08,
            'Real Estate': -0.28,
            'Energy': -0.48,
            'Financials': -0.35,
            'Industrials': -0.35,
            'Consumer Discretionary': -0.38,
            'Utilities': -0.12,
            'Communication Services': +0.08,
            'Materials': -0.30,
            'Defense': -0.12,
            default: -0.28,
        },
        fixedIncomeRatingShocks: { 'AAA': +0.03, 'AA': +0.02, 'A': -0.02, 'BBB': -0.08, 'BB': -0.20, 'B': -0.35, 'NR': -0.12 },
    },
    tech_crash_2022: {
        label: 'Bear Market Tech 2022',
        period: 'Ene – Oct 2022',
        benchmarkPct: -24,
        recoveryMonths: 18,
        description: 'Subida agresiva de tipos de interés. Nasdaq -33%, growth stocks -50%+. Value y energía fueron refugio. Bonos de larga duración cayeron significativamente.',
        sectorShocks: {
            'Technology': -0.42,
            'Healthcare': -0.08,
            'Consumer Staples': +0.02,
            'Real Estate': -0.28,
            'Energy': +0.45,
            'Financials': -0.10,
            'Industrials': -0.15,
            'Consumer Discretionary': -0.38,
            'Utilities': +0.01,
            'Communication Services': -0.40,
            'Materials': -0.20,
            'Defense': +0.12,
            default: -0.20,
        },
        // En 2022 los bonos de larga duración cayeron ~-30%; corto plazo aguantó mejor
        fixedIncomeShock: 'rate_hike_400bp',  // señal para cálculo por duración
    },
    correction_10: {
        label: 'Corrección General -10%',
        period: 'Escenario hipotético',
        benchmarkPct: -10,
        recoveryMonths: 4,
        description: 'Corrección estándar de mercado. Impacto proporcional a la beta de cada posición — activos defensivos caen menos.',
        sectorShocks: null, // Se calcula por beta
    },
    // ── Escenarios de renta fija ────────────────────────────────────────────────
    rate_hike_100bp: {
        label: 'Subida de tipos +100pb',
        period: 'Escenario hipotético',
        benchmarkPct: -3,
        recoveryMonths: 12,
        description: 'Subida de 100 puntos básicos en la curva de tipos. El impacto en bonos es proporcional a su duración modificada (ΔP/P ≈ -D × Δy). Las acciones sufren un impacto moderado.',
        sectorShocks: {
            'Technology': -0.05,
            'Real Estate': -0.08,
            'Utilities': -0.06,
            'Financials': +0.02,
            default: -0.02,
        },
        fixedIncomeShock: 'rate_hike_100bp',
    },
    credit_crisis: {
        label: 'Crisis de Crédito',
        period: 'Escenario hipotético',
        benchmarkPct: -15,
        recoveryMonths: 18,
        description: 'Ampliación de spreads crediticios. BBB: -5%, BB: -15%, B: -30%. Los bonos de alta calidad actúan como refugio. Las acciones financieras sufren más.',
        sectorShocks: {
            'Financials': -0.20,
            'Real Estate': -0.15,
            'Energy': -0.10,
            default: -0.08,
        },
        fixedIncomeShock: 'credit_crisis',
    },
};

export const getScenarios = () => SCENARIO_DEFINITIONS;

export const simulateScenario = (positions, scenarioId) => {
    const scenario = SCENARIO_DEFINITIONS[scenarioId];
    if (!scenario || !positions.length) return null;

    const results = positions.map(p => {
        const assetType = p.asset_type ?? 'equity';
        let shockPct;

        // ── Cash: nunca se ve afectado ───────────────────────────────────────
        if (assetType === 'cash') {
            shockPct = 0;

        // ── Bonos individuales: cálculo por tipo de shock ────────────────────
        } else if (assetType === 'bond') {
            if (scenario.fixedIncomeShock === 'rate_hike_100bp') {
                // ΔP/P ≈ -D_mod × Δy (Δy = +0.01 = +100pb)
                const duration = p.duration ?? 1.5;
                shockPct = -duration * 0.01;
            } else if (scenario.fixedIncomeShock === 'rate_hike_400bp') {
                // Bear market 2022: subida ~400pb en la curva
                const duration = p.duration ?? 1.5;
                shockPct = -duration * 0.04;
            } else if (scenario.fixedIncomeShock === 'credit_crisis' || scenario.fixedIncomeRatingShocks) {
                const shockMap = scenario.fixedIncomeRatingShocks ?? { 'AAA': -0.01, 'AA': -0.02, 'A': -0.03, 'BBB': -0.05, 'BB': -0.15, 'B': -0.30, 'NR': -0.08 };
                shockPct = shockMap[p.rating ?? 'BBB'] ?? -0.05;
            } else if (scenario.sectorShocks) {
                shockPct = scenario.sectorShocks[p.sector] ?? scenario.sectorShocks.default ?? -0.05;
            } else {
                shockPct = 0;
            }

        // ── ETF de renta fija: usar shock de tipo si existe, sino sector ─────
        } else if (assetType === 'bond_etf') {
            if (scenario.fixedIncomeShock === 'rate_hike_100bp') {
                const duration = p.duration ?? 5; // ETF de bonos suele tener más duración
                shockPct = -duration * 0.01;
            } else if (scenario.fixedIncomeShock === 'rate_hike_400bp') {
                const duration = p.duration ?? 5;
                shockPct = -duration * 0.04;
            } else if (scenario.sectorShocks) {
                shockPct = scenario.sectorShocks[p.sector] ?? scenario.sectorShocks.default ?? -0.10;
            } else {
                shockPct = -0.10 * (p.beta ?? 0.3);
            }

        // ── Equity: lógica original ──────────────────────────────────────────
        } else if (scenario.sectorShocks) {
            shockPct = scenario.sectorShocks[p.sector] ?? scenario.sectorShocks.default;
        } else {
            // Corrección proporcional a beta (beta 1.0 = -10%, beta 1.5 = -15%, beta 0.5 = -5%)
            shockPct = -0.10 * p.beta;
        }

        const impact = p.value * shockPct;
        return {
            ticker: p.ticker,
            name: p.name,
            sector: p.sector,
            asset_type: assetType,
            currentValue: p.value,
            weight: p.weight,
            impact,
            projectedValue: p.value + impact,
            shockPct,
        };
    });

    const totalCurrent = results.reduce((s, r) => s + r.currentValue, 0);
    const totalImpact = results.reduce((s, r) => s + r.impact, 0);
    const totalProjected = totalCurrent + totalImpact;

    // Resumen de impacto por clase de activo
    const impactByAssetClass = {};
    results.forEach(r => {
        const cls = (r.asset_type === 'bond' || r.asset_type === 'bond_etf') ? 'bond'
            : r.asset_type === 'cash' ? 'cash'
            : 'equity';
        if (!impactByAssetClass[cls]) impactByAssetClass[cls] = { impact: 0, value: 0 };
        impactByAssetClass[cls].impact += r.impact;
        impactByAssetClass[cls].value += r.currentValue;
    });

    return {
        scenario,
        results: results.sort((a, b) => a.impact - b.impact),
        totalCurrent,
        totalImpact,
        totalProjected,
        totalShockPct: totalCurrent > 0 ? (totalImpact / totalCurrent) * 100 : 0,
        impactByAssetClass,
    };
};
