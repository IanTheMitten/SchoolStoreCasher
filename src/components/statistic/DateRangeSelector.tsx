import { Calendar as CalendarIcon, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import type { StatisticDateRange } from './analyticsSampling';

interface DateRangeSelectorProps {
  dateRange: StatisticDateRange;
  onDateRangeChange: (range: StatisticDateRange) => void;
  chosenMonth: string;
  onChosenMonthChange: (value: string) => void;
  seed: string;
  onSeedChange: (value: string) => void;
}

const ranges: { value: StatisticDateRange; label: string }[] = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'chosenMonth', label: 'Chosen Month' },
  { value: 'sample4Weeks', label: 'Sample 4 Weeks' },
  { value: 'sample30Days', label: 'Sample 30 Days' },
];

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  chosenMonth,
  onChosenMonthChange,
  seed,
  onSeedChange,
}: DateRangeSelectorProps) {
  const showMonthInput = dateRange === 'chosenMonth';
  const showSeedInput = dateRange === 'sample4Weeks' || dateRange === 'sample30Days';

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

      {(showMonthInput || showSeedInput) && (
        <Card className="p-4 max-w-2xl mx-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            {showMonthInput && (
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
            )}

            {showSeedInput && (
              <div className="space-y-2">
                <Label htmlFor="statistic-seed" className="inline-flex items-center gap-2">
                  <Shuffle className="size-4 text-gray-500" />
                  Sampling seed
                </Label>
                <input
                  id="statistic-seed"
                  type="text"
                  value={seed}
                  onChange={(event) => onSeedChange(event.target.value)}
                  placeholder="e.g. spring-2026"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
