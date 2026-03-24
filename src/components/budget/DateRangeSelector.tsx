import { useEffect, useRef, useState } from 'react';
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
  const [singleDayEnabled, setSingleDayEnabled] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const previousRange = useRef<DateRange>(dateRange);

  useEffect(() => {
    if (previousRange.current !== 'custom' && dateRange === 'custom') {
      const enableSingleDay =
        customStart !== null && customEnd !== null && isSameDay(customStart, customEnd);
      setSingleDayEnabled(enableSingleDay);
    }

    previousRange.current = dateRange;
  }, [dateRange, customStart, customEnd]);

  const handleStartSelect = (date: Date | undefined) => {
    const nextStart = date ?? null;
    onDateRangeChange('custom');
    onCustomStartChange(nextStart);
    setIsStartOpen(false);

    if (!nextStart) {
      return;
    }

    if (singleDayEnabled || !customEnd || customEnd < nextStart) {
      onCustomEndChange(nextStart);
    }
  };

  const handleEndSelect = (date: Date | undefined) => {
    const nextEnd = date ?? null;
    onDateRangeChange('custom');
    onCustomEndChange(nextEnd);
    setIsEndOpen(false);

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
              <Label>Start date</Label>
              <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate text-left">{formatDate(customStart)}</span>
                    <CalendarIcon className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customStart ?? undefined} onSelect={handleStartSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End date</Label>
              <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={singleDayEnabled}
                  >
                    <span className="truncate text-left">{formatDate(customEnd)}</span>
                    <CalendarIcon className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customEnd ?? undefined} onSelect={handleEndSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
