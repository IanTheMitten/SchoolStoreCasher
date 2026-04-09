import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';

export type StatisticDateRange = 'today' | 'thisWeek' | 'thisMonth' | 'allTime' | 'custom';

export interface StatisticRangeBounds {
  start?: Date;
  end?: Date;
}

export interface StatisticRangeSelection {
  range: StatisticDateRange;
  bounds: StatisticRangeBounds;
  customStart: Date | null;
  customEnd: Date | null;
  isValid: boolean;
}

interface DateRangeSelectorProps {
  value: StatisticRangeSelection;
  onChange: (selection: StatisticRangeSelection) => void;
}

const ranges: { value: StatisticDateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function resolveStatisticRangeBounds(
  range: StatisticDateRange,
  customStart: Date | null,
  customEnd: Date | null,
): StatisticRangeBounds {
  const now = new Date();
  const today = startOfDay(now);

  if (range === 'allTime') {
    return {};
  }

  if (range === 'today') {
    return { start: today, end: today };
  }

  if (range === 'thisWeek') {
    const dayIndex = today.getDay();
    const daysSinceMonday = dayIndex === 0 ? 6 : dayIndex - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceMonday);
    return { start: startOfWeek, end: today };
  }

  if (range === 'thisMonth') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: today,
    };
  }

  if (!customStart || !customEnd || customStart > customEnd) {
    return {};
  }

  return {
    start: startOfDay(customStart),
    end: startOfDay(customEnd),
  };
}

export function createStatisticRangeSelection(
  range: StatisticDateRange,
  customStart: Date | null = null,
  customEnd: Date | null = null,
): StatisticRangeSelection {
  const isValid = range !== 'custom' || (!!customStart && !!customEnd && customStart <= customEnd);
  return {
    range,
    bounds: resolveStatisticRangeBounds(range, customStart, customEnd),
    customStart,
    customEnd,
    isValid,
  };
}

function toDateInputValue(date: Date | null): string {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [customError, setCustomError] = useState<string | null>(null);

  const nextSelection = useMemo(
    () => createStatisticRangeSelection(value.range, value.customStart, value.customEnd),
    [value.range, value.customStart, value.customEnd],
  );

  const emitSelection = (range: StatisticDateRange, customStart: Date | null, customEnd: Date | null) => {
    const selection = createStatisticRangeSelection(range, customStart, customEnd);

    if (selection.range === 'custom' && customStart && customEnd && customStart > customEnd) {
      setCustomError('Start date must be on or before end date.');
    } else {
      setCustomError(null);
    }

    onChange(selection);
  };

  const handleRangeClick = (range: StatisticDateRange) => {
    if (range === 'custom') {
      emitSelection('custom', value.customStart, value.customEnd);
      return;
    }

    emitSelection(range, null, null);
  };

  const handleCustomStartChange = (nextStart: Date | null) => {
    emitSelection('custom', nextStart, value.customEnd);
  };

  const handleCustomEndChange = (nextEnd: Date | null) => {
    emitSelection('custom', value.customStart, nextEnd);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <CalendarIcon className="size-5 text-gray-400" />
        {ranges.map((range) => (
          <Button
            key={range.value}
            variant={value.range === range.value ? 'default' : 'outline'}
            onClick={() => handleRangeClick(range.value)}
            size="sm"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {value.range === 'custom' && (
        <Card className="p-4 max-w-2xl mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stat-custom-start">Start date</Label>
              <input
                id="stat-custom-start"
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(value.customStart)}
                onChange={(event) => handleCustomStartChange(parseDateInputValue(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stat-custom-end">End date</Label>
              <input
                id="stat-custom-end"
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(value.customEnd)}
                onChange={(event) => handleCustomEndChange(parseDateInputValue(event.target.value))}
              />
            </div>
          </div>

          {!nextSelection.isValid && (
            <p className="mt-3 text-sm text-red-600">{customError ?? 'Select both dates and ensure start is on or before end.'}</p>
          )}
        </Card>
      )}
    </div>
  );
}
