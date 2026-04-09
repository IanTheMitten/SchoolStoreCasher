import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';

export type StatisticDateRange = 'today' | 'thisWeek' | 'thisMonth' | 'allTime' | 'custom';

interface DateRangeSelectorProps {
  dateRange: StatisticDateRange;
  onDateRangeChange: (range: StatisticDateRange) => void;
  customStart: Date | null;
  customEnd: Date | null;
  onCustomStartChange: (date: Date | null) => void;
  onCustomEndChange: (date: Date | null) => void;
}

const ranges: { value: StatisticDateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

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

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: DateRangeSelectorProps) {
  const handleCustomStartChange = (nextStart: Date | null) => {
    onDateRangeChange('custom');
    onCustomStartChange(nextStart);

    if (!nextStart) {
      return;
    }

    if (!customEnd || customEnd < nextStart) {
      onCustomEndChange(nextStart);
    }
  };

  const handleCustomEndChange = (nextEnd: Date | null) => {
    onDateRangeChange('custom');
    onCustomEndChange(nextEnd);

    if (nextEnd && customStart && nextEnd < customStart) {
      onCustomStartChange(nextEnd);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <CalendarIcon className="size-5 text-gray-400" />
        {ranges.map((range) => (
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
        <Card className="p-4 max-w-2xl mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stat-custom-start">Start date</Label>
              <input
                id="stat-custom-start"
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(customStart)}
                onChange={(event) => handleCustomStartChange(parseDateInputValue(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stat-custom-end">End date</Label>
              <input
                id="stat-custom-end"
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={toDateInputValue(customEnd)}
                onChange={(event) => handleCustomEndChange(parseDateInputValue(event.target.value))}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
