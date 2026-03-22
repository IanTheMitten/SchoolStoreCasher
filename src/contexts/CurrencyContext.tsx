import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type CurrencyCode = 'KRW' | 'USD' | 'EUR';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatCurrency: (amount: number | undefined | null) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

function formatAmount(amount: number | undefined | null, currency: CurrencyCode): string {
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

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('schoolstore_currency');
      if (saved === 'KRW' || saved === 'USD' || saved === 'EUR') return saved;
    } catch {}
    return 'KRW';
  });

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('schoolstore_currency', c);
    } catch {}
  }, []);

  const formatCurrency = useCallback(
    (amount: number | undefined | null) => formatAmount(amount, currency),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
