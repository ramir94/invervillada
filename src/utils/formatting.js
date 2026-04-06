export const formatCurrency = (value, currency = 'EUR') => {
    const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(value);
};

export const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
};
