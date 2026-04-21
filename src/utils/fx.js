// Tipos de cambio a EUR (alineados con informe Singular Bank 17/04/2026).
// Convención: 1 unidad de la divisa listada equivale a FX_TO_EUR[divisa] euros.
// Este módulo centraliza las tasas para que todos los servicios y cálculos
// (analytics, ingresos, gastos, derivados) operen con la misma referencia.
export const FX_TO_EUR = {
    EUR: 1,
    USD: 0.8500,
    CHF: 1.0873,
    DKK: 0.1338,
    GBP: 1.1489,
};

// Convierte un importe en su divisa nativa a EUR.
// Si la divisa no está en la tabla, asume 1:1 (defensivo — evita NaN).
export const toEur = (amount, currency) => {
    const rate = FX_TO_EUR[currency] ?? 1;
    return Number(amount) * rate;
};
