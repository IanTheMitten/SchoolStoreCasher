import type { CurrencyCode } from '../contexts/CurrencyContext';

/** Rounds monetary values to 2 decimal places to avoid floating-point errors. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Fallback for use outside React (e.g. in non-component code)
// Uses KRW as default; components should use useCurrency() for dynamic currency
export function formatCurrency(
  amount: number | undefined | null,
  currency: CurrencyCode = 'KRW'
): string {
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
    const symbol = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : '€';
    const digits = currency === 'KRW' ? 0 : 2;
    return `${symbol}${value.toFixed(digits)}`;
  }
}

export function formatKRW(amount: number | undefined | null) {
  return formatCurrency(amount, 'KRW');
}

export default formatKRW;
