import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import type { StatisticDateRange } from './analyticsSampling';

interface ResolvedDateRange {
  dateRange: StatisticDateRange;
  startDate?: Date;
  endDate?: Date;
}

interface DateRangeSelectorProps {
  onRangeResolvedChange: (selection: ResolvedDateRange) => void;
}

const ranges: { value: StatisticDateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeekSunday(date: Date): Date {
  const next = startOfWeekMonday(date);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function resolvePresetRange(dateRange: Exclude<StatisticDateRange, 'custom'>): ResolvedDateRange {
  const now = new Date();

  if (dateRange === 'today') {
    return {
      dateRange,
      startDate: startOfDay(now),
      endDate: endOfDay(now),
    };
  }

  if (dateRange === 'thisWeek') {
    return {
      dateRange,
      startDate: startOfWeekMonday(now),
      endDate: endOfWeekSunday(now),
    };
  }

  if (dateRange === 'thisMonth') {
    return {
      dateRange,
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  }

  return {
    dateRange,
  };
}

export function DateRangeSelector({ onRangeResolvedChange }: DateRangeSelectorProps) {
  const [dateRange, setDateRange] = useState<StatisticDateRange>('thisMonth');
  const [customStart, setCustomStart] = useState(() => toDateInputValue(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(new Date()));

  const customStartDate = useMemo(() => parseDateInputValue(customStart), [customStart]);
  const customEndDate = useMemo(() => parseDateInputValue(customEnd), [customEnd]);

  const validationMessage = useMemo(() => {
    if (dateRange !== 'custom') {
      return '';
    }

    if (!customStartDate || !customEndDate) {
      return 'Choose both start and end dates.';
    }

    if (customStartDate.getTime() > customEndDate.getTime()) {
      return 'Start date must be on or before end date.';
    }

    return '';
  }, [dateRange, customEndDate, customStartDate]);

  useEffect(() => {
    if (dateRange === 'custom') {
      if (validationMessage || !customStartDate || !customEndDate) {
        return;
      }

      onRangeResolvedChange({
        dateRange,
        startDate: startOfDay(customStartDate),
        endDate: endOfDay(customEndDate),
      });

      return;
    }

    onRangeResolvedChange(resolvePresetRange(dateRange));
  }, [customEndDate, customStartDate, dateRange, onRangeResolvedChange, validationMessage]);

  const showCustomInputs = dateRange === 'custom';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <CalendarIcon className="size-5 text-gray-400" />
        {ranges.map((range) => (
          <Button
            key={range.value}
            variant={dateRange === range.value ? 'default' : 'outline'}
            onClick={() => setDateRange(range.value)}
            size="sm"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {showCustomInputs && (
        <Card className="p-4 max-w-2xl mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statistic-custom-start">Start date</Label>
              <input
                id="statistic-custom-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statistic-custom-end">End date</Label>
              <input
                id="statistic-custom-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
              />
            </div>
          </div>

          {validationMessage && <p className="mt-3 text-sm text-red-600">{validationMessage}</p>}
        </Card>
      )}
    </div>
  );
}
