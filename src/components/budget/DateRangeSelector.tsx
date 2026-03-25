import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' }
];

const formatDate = (date: Date | null) => {
  if (!date) {
    return 'Select date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const toDateInputValue = (date: Date | null) => {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange
}: DateRangeSelectorProps) {
  const singleDay = customStart !== null && customEnd !== null && isSameDay(customStart, customEnd);

  const handleCustomStartSelect = (date: Date | undefined) => {
    const nextStart = date ?? null;
    onDateRangeChange('custom');
    onCustomStartChange(nextStart);

    if (!nextStart) {
      return;
    }

    if (singleDay || (customEnd && customEnd < nextStart)) {
      onCustomEndChange(nextStart);
    }
  };

  const handleCustomEndSelect = (date: Date | undefined) => {
    const nextEnd = date ?? null;
    onDateRangeChange('custom');
    onCustomEndChange(nextEnd);

    if (nextEnd && customStart && nextEnd < customStart) {
      onCustomStartChange(nextEnd);
    }
  };

  const handleSingleDayToggle = (checked: boolean) => {
    onDateRangeChange('custom');

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
            <Switch id="single-day-toggle" checked={singleDay} onCheckedChange={handleSingleDayToggle} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start date</Label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(customStart)}
                onChange={(event) => handleCustomStartSelect(parseDateInputValue(event.target.value) ?? undefined)}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {formatDate(customStart)}
                    <CalendarIcon className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customStart ?? undefined} onSelect={handleCustomStartSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End date</Label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(customEnd)}
                onChange={(event) => handleCustomEndSelect(parseDateInputValue(event.target.value) ?? undefined)}
                disabled={singleDay}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal" disabled={singleDay}>
                    {formatDate(customEnd)}
                    <CalendarIcon className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customEnd ?? undefined} onSelect={handleCustomEndSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
