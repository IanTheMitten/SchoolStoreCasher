import { localDb } from './localDb';

// Standalone local-only mode - all data is stored in IndexedDB on the device
// No server connectivity required

// Products API
export const productsAPI = {
  getAll: async () => {
    return localDb.getAllProducts();
  },

  getById: async (id: string) => {
    return localDb.getProductById(id);
  },

  create: async (product: any) => {
    return localDb.createProduct(product);
  },

  update: async (id: string, product: any) => {
    return localDb.updateProduct(id, product);
  },

  delete: async (id: string) => {
    return localDb.deleteProduct(id);
  },

  adjustStock: async (id: string, adjustment: { change: number; reason?: string; unit_cost?: number; reference?: string; user?: string }) => {
    return localDb.adjustStock(id, adjustment);
  },

  getAdjustmentsByProduct: async (id: string, filters?: { start?: string; end?: string }) => {
    return localDb.getProductAdjustments(id, filters);
  },

  getAdjustments: async (filters?: { productIds?: string[]; start?: string; end?: string }) => {
    return localDb.getInventoryAdjustments(filters);
  },
};

// Students API
export const studentsAPI = {
  getAll: async () => {
    return localDb.getAllStudents();
  },

  getById: async (id: string) => {
    return localDb.getStudentById(id);
  },

  create: async (student: { name: string; grade?: string; gender?: string; barcode?: string }) => {
    return localDb.createStudent(student);
  },

  update: async (id: string, student: { name: string; grade?: string; gender?: string; barcode?: string }) => {
    return localDb.updateStudent(id, student);
  },

  delete: async (id: string) => {
    return localDb.deleteStudent(id);
  },

  getPurchases: async (id: string) => {
    return localDb.getPurchasesByStudent(id);
  },
};

// Sales/Transactions API
export const salesAPI = {
  create: async (sale: {
    customerType?: 'student' | 'teacher' | null;
    customerId?: string | null;
    customerName?: string | null;
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
    paymentMethod: 'cash' | 'card';
    timestamp?: string;
  }) => {
    return localDb.createTransaction(sale);
  },
  
  getAll: async (filters?: { customerType?: 'student' | 'teacher'; customerId?: string; studentId?: string; start?: string; end?: string }) => {
    return localDb.getAllTransactions(filters as any);
  },
};

// Grades API
export const gradesAPI = {
  getAll: async () => {
    const students = await localDb.getAllStudents();
    const grades = Array.from(new Set(students.map(s => s.grade))).filter(Boolean);
    return grades;
  },
  
  getStudents: async (grade: string) => {
    const students = await localDb.getAllStudents();
    return students.filter(s => s.grade === grade);
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async (filters?: { start?: string; end?: string }) => {
    return localDb.getAllExpenses(filters as any);
  },
  
  create: async (expense: { amount: number; category?: string; note?: string; related_product_id?: string; purchase_quantity?: number; datetime?: string }) => {
    return localDb.createExpense(expense);
  },
  
  delete: async (id: string) => {
    return localDb.deleteExpense(id);
  },
};

// Teachers API
export const teachersAPI = {
  getAll: async () => {
    return localDb.getAllTeachers();
  },
  getById: async (id: string) => {
    return localDb.getTeacherById(id);
  },
  create: async (teacher: any) => {
    return localDb.createTeacher(teacher);
  },
  update: async (id: string, teacher: any) => {
    return localDb.updateTeacher(id, teacher);
  },
  delete: async (id: string) => {
    return localDb.deleteTeacher(id);
  }
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    const cats = await localDb.getAllCategories();
    return cats;
  },
  create: async (name: string) => {
    return localDb.createCategory({ name });
  },
  update: async (id: string, data: any) => {
    return localDb.updateCategory(id, data);
  },
  delete: async (id: string) => {
    return localDb.deleteCategory(id);
  }
};
