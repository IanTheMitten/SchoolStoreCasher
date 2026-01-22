export type CurrencyCode = 'KRW' | 'USD' | 'EUR';

// Global currency state used by helpers below.
// We also expose setter/getter so the app can control it.
let currentCurrency: CurrencyCode = 'KRW';

export function setCurrency(currency: CurrencyCode) {
  currentCurrency = currency;
}

export function getCurrency(): CurrencyCode {
  return currentCurrency;
}

export function formatCurrency(
  amount: number | undefined | null,
  currency: CurrencyCode = currentCurrency
) {
  const value = typeof amount === 'number' ? amount : 0;

  try {
    const locale = currency === 'KRW' ? 'ko-KR' : undefined;
    const maximumFractionDigits = currency === 'KRW' ? 0 : 2;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits,
    }).format(value);
  } catch {
    const symbol =
      currency === 'KRW' ? '₩' :
      currency === 'USD' ? '$' :
      currency === 'EUR' ? '€' : '';

    const digits = currency === 'KRW' ? 0 : 2;
    return `${symbol}${value.toFixed(digits)}`;
  }
}

// Backwards-compatible helper: existing code that calls formatKRW will now
// format using the currently selected currency.
export function formatKRW(amount: number | undefined | null) {
  return formatCurrency(amount);
}

export default formatKRW;
