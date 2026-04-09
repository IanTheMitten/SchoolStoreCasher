import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';

export type StatisticDateRange = 'allTime' | 'thisMonth' | 'chosenMonth';

interface DateRangeSelectorProps {
  dateRange: StatisticDateRange;
  onDateRangeChange: (range: StatisticDateRange) => void;
  chosenMonth: string;
  onChosenMonthChange: (value: string) => void;
}

const ranges: { value: StatisticDateRange; label: string }[] = [
  { value: 'allTime', label: 'All Time' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'chosenMonth', label: 'Chosen Month' },
];

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  chosenMonth,
  onChosenMonthChange,
}: DateRangeSelectorProps) {
  const showMonthInput = dateRange === 'chosenMonth';

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

      {showMonthInput && (
        <Card className="p-4 max-w-2xl mx-auto">
          <div className="space-y-2">
            <Label htmlFor="statistic-month">Chosen month</Label>
            <input
              id="statistic-month"
              type="month"
              value={chosenMonth}
              onChange={(event) => onChosenMonthChange(event.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
