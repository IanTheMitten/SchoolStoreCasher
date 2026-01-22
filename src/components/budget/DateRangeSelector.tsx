import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
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
  { value: 'lastMonth', label: 'Last Month' }
];

export function DateRangeSelector({
  dateRange,
  onDateRangeChange
}: DateRangeSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <Calendar className="size-5 text-gray-400" />
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
  );
}
