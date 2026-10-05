import type { ReactNode } from 'react';
import { Card } from '../ui/card';

export const COLORS = {
  revenue: '#60a5fa',
  profit: '#16a34a',
  muted: '#9ca3af',
  warn: '#d97706',
};

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-center py-8 text-gray-500 text-sm">{children}</div>;
}

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 ${value === o.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '12px',
};

export function formatPct(v: number | null, digits = 0): string {
  return v === null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`;
}
