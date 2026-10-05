import type { Student, Teacher } from '../../App';

export const GRADES = ['Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', '국내반'];
export const GENDERS = ['Male', 'Female'];

export type PersonKind = 'student' | 'teacher';

export interface Person {
  kind: PersonKind;
  id: string;
  name: string;
  grade?: string;
  gender?: string;
  subject?: string;
  email?: string;
  barcode?: string;
  spent: number;
  purchases: number;
  lastPurchase: Date | null;
}

export interface PeopleActions {
  students: Student[];
  teachers: Teacher[];
  /** Barcodes already used anywhere (students, teachers, products), for generation. */
  takenBarcodes: () => string[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
  onCreateTeacher: (teacher: Teacher) => Promise<void>;
  onUpdateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
}

export const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
