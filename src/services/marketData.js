const MOCK_PRICES = {
    ABT: 112.50,
    AMZN: 175.30,
    CVS: 78.40,
    DLR: 145.20,
    DOC: 18.90,
    LMT: 430.10,
    MO: 44.50,
    NESN: 98.40,
    NOVN: 88.20,
    PEP: 168.90,
    SAP: 170.50,
    SHEL: 32.40,
    SIE: 175.60,
    UNH: 480.20,
};

const MOCK_METADATA = {
    ABT: { yield: 2.0, risk: "Low" },
    AMZN: { yield: 0.0, risk: "Medium" },
    CVS: { yield: 3.5, risk: "Low-Medium" },
    DLR: { yield: 3.8, risk: "Medium" },
    DOC: { yield: 5.5, risk: "Medium" },
    LMT: { yield: 2.8, risk: "Low" },
    MO: { yield: 8.9, risk: "Medium-High" },
    NESN: { yield: 3.0, risk: "Low" },
    NOVN: { yield: 3.8, risk: "Low" },
    PEP: { yield: 3.0, risk: "Low" },
    SAP: { yield: 1.2, risk: "Medium" },
    SHEL: { yield: 3.9, risk: "Medium" },
    SIE: { yield: 2.5, risk: "Medium" },
    UNH: { yield: 1.5, risk: "Low" },
};

const getDailyChange = () => (Math.random() * 4 - 2);

export const getMarketData = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const data = {};
            Object.keys(MOCK_PRICES).forEach(ticker => {
                const basePrice = MOCK_PRICES[ticker];
                const changePct = getDailyChange();
                const currentPrice = basePrice * (1 + changePct / 100);

                data[ticker] = {
                    price: currentPrice,
                    changePercent: changePct,
                    changeAmount: currentPrice - basePrice,
                    ...MOCK_METADATA[ticker]
                };
            });
            resolve(data);
        }, 800);
    });
};
