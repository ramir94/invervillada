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
    },
    tech_crash_2022: {
        label: 'Bear Market Tech 2022',
        period: 'Ene – Oct 2022',
        benchmarkPct: -24,
        recoveryMonths: 18,
        description: 'Subida agresiva de tipos de interés. Nasdaq -33%, growth stocks -50%+. Value y energía fueron refugio.',
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
    },
    correction_10: {
        label: 'Corrección General -10%',
        period: 'Escenario hipotético',
        benchmarkPct: -10,
        recoveryMonths: 4,
        description: 'Corrección estándar de mercado. Impacto proporcional a la beta de cada posición — activos defensivos caen menos.',
        sectorShocks: null, // Se calcula por beta
    },
};

export const getScenarios = () => SCENARIO_DEFINITIONS;

export const simulateScenario = (positions, scenarioId) => {
    const scenario = SCENARIO_DEFINITIONS[scenarioId];
    if (!scenario || !positions.length) return null;

    const results = positions.map(p => {
        let shockPct;
        if (scenario.sectorShocks) {
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

    return {
        scenario,
        results: results.sort((a, b) => a.impact - b.impact),
        totalCurrent,
        totalImpact,
        totalProjected,
        totalShockPct: totalCurrent > 0 ? (totalImpact / totalCurrent) * 100 : 0,
    };
};
