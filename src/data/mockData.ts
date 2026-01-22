import type { Product, Student } from '../App';

export const mockProducts: Product[] = [
  {
    id: 'p1',
    sku: 'STN-001',
    name: 'Notebook (A4)',
    price: 3.50,
    unitCost: 2.00,
    description: '80 pages, ruled',
    category: 'Stationery',
    stock: 25,
    reorderLevel: 10,
    supplier: 'Office Supplies Co.',
    barcode: '1234567890123'
  },
  {
    id: 'p2',
    sku: 'STN-002',
    name: 'Pencil Set',
    price: 2.00,
    unitCost: 1.20,
    description: 'Pack of 5 HB pencils',
    category: 'Stationery',
    stock: 3,
    reorderLevel: 15,
    supplier: 'Office Supplies Co.',
    barcode: '1234567890124'
  },
  {
    id: 'p3',
    sku: 'UNI-001',
    name: 'School T-Shirt (M)',
    price: 15.00,
    unitCost: 8.50,
    description: 'Navy blue with school logo',
    category: 'Uniform',
    stock: 8,
    reorderLevel: 5,
    supplier: 'Uniform Direct',
    barcode: '1234567890125'
  },
  {
    id: 'p4',
    sku: 'ELC-001',
    name: 'Calculator',
    price: 12.50,
    unitCost: 7.00,
    description: 'Scientific calculator',
    category: 'Electronics',
    stock: 0,
    reorderLevel: 8,
    supplier: 'Tech Supplies Inc.',
    barcode: '1234567890126'
  },
  {
    id: 'p5',
    sku: 'STN-003',
    name: 'Eraser',
    price: 0.50,
    unitCost: 0.20,
    description: 'White rubber eraser',
    category: 'Stationery',
    stock: 50,
    reorderLevel: 20,
    supplier: 'Office Supplies Co.',
    barcode: '1234567890127'
  },
  {
    id: 'p6',
    sku: 'STN-004',
    name: 'Ruler (30cm)',
    price: 1.25,
    unitCost: 0.60,
    description: 'Clear plastic ruler',
    category: 'Stationery',
    stock: 15,
    reorderLevel: 10,
    supplier: 'Office Supplies Co.',
    barcode: '1234567890128'
  },
  {
    id: 'p7',
    sku: 'UNI-002',
    name: 'School Tie',
    price: 8.00,
    unitCost: 4.50,
    description: 'Striped school tie',
    category: 'Uniform',
    stock: 12,
    reorderLevel: 8,
    supplier: 'Uniform Direct',
    barcode: '1234567890129'
  },
  {
    id: 'p8',
    sku: 'ART-001',
    name: 'Art Supply Kit',
    price: 20.00,
    unitCost: 12.00,
    description: 'Includes paints, brushes, palette',
    category: 'Art',
    stock: 2,
    reorderLevel: 5,
    supplier: 'Art World',
    barcode: '1234567890130'
  },
  {
    id: 'p9',
    sku: 'ACC-001',
    name: 'Water Bottle',
    price: 7.50,
    unitCost: 4.00,
    description: '750ml sports bottle',
    category: 'Accessories',
    stock: 18,
    reorderLevel: 10,
    supplier: 'Sports Gear Ltd.',
    barcode: '1234567890131'
  },
  {
    id: 'p10',
    sku: 'ELC-002',
    name: 'USB Drive (16GB)',
    price: 10.00,
    unitCost: 5.50,
    description: '16GB USB 3.0',
    category: 'Electronics',
    stock: 6,
    reorderLevel: 10,
    supplier: 'Tech Supplies Inc.',
    barcode: '1234567890132'
  }
];

export const mockStudents: Student[] = [
  { id: 's1', name: 'Emma Johnson', grade: 'Grade 5', gender: 'Female' },
  { id: 's2', name: 'Liam Smith', grade: 'Grade 6', gender: 'Male' },
  { id: 's3', name: 'Olivia Brown', grade: 'Grade 7', gender: 'Female' },
  { id: 's4', name: 'Noah Davis', grade: 'Grade 8', gender: 'Male' },
  { id: 's5', name: 'Ava Martinez', grade: 'Grade 9', gender: 'Female' },
  { id: 's6', name: 'Ethan Wilson', grade: 'Grade 10', gender: 'Male' },
  { id: 's7', name: 'Sophia Anderson', grade: 'Grade 11', gender: 'Female' },
  { id: 's8', name: 'Mason Taylor', grade: 'Grade 12', gender: 'Male' },
  { id: 's9', name: 'Isabella Thomas', grade: 'Grade 5', gender: 'Female' },
  { id: 's10', name: 'Lucas Moore', grade: 'Grade 6', gender: 'Male' },
  { id: 's11', name: 'Mia Clark', grade: 'Grade 7', gender: 'Female' },
  { id: 's12', name: 'James Rodriguez', grade: 'Grade 8', gender: 'Male' },
  { id: 's13', name: 'Amelia Lewis', grade: 'Grade 9', gender: 'Female' },
  { id: 's14', name: 'Benjamin Walker', grade: 'Grade 10', gender: 'Male' },
  { id: 's15', name: 'Charlotte Hall', grade: 'Grade 11', gender: 'Female' },
  { id: 's16', name: 'Henry Allen', grade: 'Grade 12', gender: 'Male' }
];

export const mockTeachers = [
  { id: 't1', name: 'Mr. Anderson', subject: 'Mathematics', email: 'anderson@school.edu' },
  { id: 't2', name: 'Ms. Brown', subject: 'English', email: 'brown@school.edu' },
  { id: 't3', name: 'Mrs. Clark', subject: 'Science', email: 'clark@school.edu' },
  { id: 't4', name: 'Mr. Davis', subject: 'History', email: 'davis@school.edu' }
];
