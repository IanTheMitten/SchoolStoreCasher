import type { Student, Transaction } from '../../App';

export interface TopDayRow {
  dayKey: string;
  date: Date;
  weekday: string;
  revenue: number;
  txCount: number;
}

export interface TopCustomerRow {
  studentId: string;
  studentName: string;
  grade: string;
  spend: number;
  visits: number;
  averageSpendPerVisit: number;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekdayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function topDaysByRevenue(transactions: Transaction[], limit: number): TopDayRow[] {
  const map = new Map<string, { revenue: number; txCount: number }>();

  for (const transaction of transactions) {
    const dayKey = toDayKey(transaction.timestamp);
    const current = map.get(dayKey) ?? { revenue: 0, txCount: 0 };
    map.set(dayKey, {
      revenue: current.revenue + transaction.total,
      txCount: current.txCount + 1,
    });
  }

  return Array.from(map.entries())
    .map(([dayKey, values]) => {
      const date = parseDayKey(dayKey);
      return {
        dayKey,
        date,
        weekday: getWeekdayLabel(date),
        revenue: values.revenue,
        txCount: values.txCount,
      };
    })
    .sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }

      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, Math.max(limit, 0));
}

export function topCustomers(
  transactions: Transaction[],
  students: Student[],
  limit: number,
): TopCustomerRow[] {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const totalsByStudent = new Map<string, { spend: number; visits: number }>();

  for (const transaction of transactions) {
    if (!transaction.studentId) {
      continue;
    }

    const current = totalsByStudent.get(transaction.studentId) ?? { spend: 0, visits: 0 };
    totalsByStudent.set(transaction.studentId, {
      spend: current.spend + transaction.total,
      visits: current.visits + 1,
    });
  }

  return Array.from(totalsByStudent.entries())
    .map(([studentId, values]) => {
      const student = studentById.get(studentId);
      return {
        studentId,
        studentName: student?.name ?? 'Unknown student',
        grade: student?.grade ?? '—',
        spend: values.spend,
        visits: values.visits,
        averageSpendPerVisit: values.visits > 0 ? values.spend / values.visits : 0,
      };
    })
    .sort((a, b) => {
      if (b.spend !== a.spend) {
        return b.spend - a.spend;
      }

      return b.visits - a.visits;
    })
    .slice(0, Math.max(limit, 0));
}
