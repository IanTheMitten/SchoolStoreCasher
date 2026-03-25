import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import type { DateRange } from './BudgetPage';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  customStart: Date | null;
  customEnd: Date | null;
  onCustomStartChange: (date: Date | null) => void;
  onCustomEndChange: (date: Date | null) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom' }
];

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const toDateInputValue = (date: Date | null) => {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const fromDateInputValue = (value: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange
}: DateRangeSelectorProps) {
  const [singleDayEnabled, setSingleDayEnabled] = useState(false);
  const previousRange = useRef<DateRange>(dateRange);

  useEffect(() => {
    if (previousRange.current !== 'custom' && dateRange === 'custom') {
      const enableSingleDay =
        customStart !== null && customEnd !== null && isSameDay(customStart, customEnd);
      setSingleDayEnabled(enableSingleDay);
    }

    previousRange.current = dateRange;
  }, [dateRange, customStart, customEnd]);

  const handleStartInputChange = (value: string) => {
    const nextStart = fromDateInputValue(value);
    onDateRangeChange('custom');
    onCustomStartChange(nextStart);

    if (!nextStart) {
      return;
    }

    if (singleDayEnabled || !customEnd || customEnd < nextStart) {
      onCustomEndChange(nextStart);
    }
  };

  const handleEndInputChange = (value: string) => {
    const nextEnd = fromDateInputValue(value);
    onDateRangeChange('custom');
    onCustomEndChange(nextEnd);

    if (!nextEnd || !customStart) {
      return;
    }

    if (nextEnd < customStart) {
      onCustomStartChange(nextEnd);
    }
  };

  const handleSingleDayToggle = (checked: boolean) => {
    onDateRangeChange('custom');
    setSingleDayEnabled(checked);

    if (!checked) {
      return;
    }

    if (customStart) {
      onCustomEndChange(customStart);
      return;
    }

    if (customEnd) {
      onCustomStartChange(customEnd);
      return;
    }

    const today = new Date();
    onCustomStartChange(today);
    onCustomEndChange(today);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <CalendarIcon className="size-5 text-gray-400" />
        {ranges.map(range => (
          <Button
            key={range.value}
            variant={dateRange === range.value ? 'default' : 'outline'}
            onClick={() => onDateRangeChange(range.value)}
            size="sm"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {dateRange === 'custom' && (
        <Card className="p-4 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="single-day-toggle">Single day</Label>
            <Switch id="single-day-toggle" checked={singleDayEnabled} onCheckedChange={handleSingleDayToggle} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-start-date">Start date</Label>
              <input
                id="custom-start-date"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={toDateInputValue(customStart)}
                onChange={event => handleStartInputChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-end-date">End date</Label>
              <input
                id="custom-end-date"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={toDateInputValue(customEnd)}
                onChange={event => handleEndInputChange(event.target.value)}
                disabled={singleDayEnabled}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
