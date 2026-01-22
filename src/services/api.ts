import { localDb } from './localDb';

// API configuration
// If VITE_API_URL is not set, use relative URLs (same origin)
// This works when frontend is served from the same backend
const API_URL = import.meta.env.VITE_API_URL || '';
const USE_LOCAL = import.meta.env.VITE_USE_LOCAL === 'true';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, redirect to login
      window.location.href = `${API_URL}/login`;
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Products API
export const productsAPI = {
  getAll: async () => {
    if (USE_LOCAL) return localDb.getAllProducts();
    return apiCall('/api/products');
  },

  getById: async (id: string) => {
    if (USE_LOCAL) return localDb.getProductById(id);
    return apiCall(`/api/products/${id}`);
  },

  create: async (product: any) => {
    if (USE_LOCAL) return localDb.createProduct(product);
    return apiCall('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  update: async (id: string, product: any) => {
    if (USE_LOCAL) return localDb.updateProduct(id, product);
    return apiCall(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  adjustStock: async (id: string, adjustment: { change: number; reason?: string; unit_cost?: number; reference?: string; user?: string }) => {
    if (USE_LOCAL) return localDb.adjustStock(id, adjustment);
    return apiCall(`/api/products/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  },
};

// Students API
export const studentsAPI = {
  getAll: async () => {
    if (USE_LOCAL) return localDb.getAllStudents();
    return apiCall('/api/students');
  },

  getById: async (id: string) => {
    if (USE_LOCAL) return localDb.getStudentById(id);
    return apiCall(`/api/students/${id}`);
  },

  create: async (student: { name: string; grade?: string; gender?: string }) => {
    if (USE_LOCAL) return localDb.createStudent(student);
    return apiCall('/api/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  },

  update: async (id: string, student: any) => {
    if (USE_LOCAL) return localDb.updateStudent(id, student);
    return apiCall(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student),
    });
  },

  delete: async (id: string) => {
    if (USE_LOCAL) return localDb.deleteStudent(id);
    return apiCall(`/api/students/${id}`, {
      method: 'DELETE',
    });
  },

  getPurchases: async (id: string) => {
    if (USE_LOCAL) return localDb.getPurchasesByStudent(id);
    return apiCall(`/api/transactions?studentId=${id}`);
  },
};

// Sales/Transactions API
export const salesAPI = {
  create: async (sale: {
    studentId?: string | null;
    studentName?: string | null;
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
    paymentMethod: 'cash' | 'card' | 'student_balance';
    timestamp?: string;
  }) => {
    if (USE_LOCAL) return localDb.createTransaction(sale);
    return apiCall('/api/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },
  
  getAll: async (filters?: { studentId?: string; start?: string; end?: string }) => {
    if (USE_LOCAL) return localDb.getAllTransactions(filters as any);
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/api/transactions${query}`);
  },
};

// Grades API
export const gradesAPI = {
  getAll: async () => {
    if (USE_LOCAL) {
      const students = await localDb.getAllStudents();
      return Array.from(new Set(students.map(s => s.grade))).filter(Boolean);
    }
    return apiCall('/api/grades');
  },
  
  getStudents: async (grade: string) => {
    if (USE_LOCAL) {
      const students = await localDb.getAllStudents();
      return students.filter(s => s.grade === grade);
    }
    return apiCall(`/api/grades/${grade}/students`);
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async (filters?: { start?: string; end?: string }) => {
    if (USE_LOCAL) return localDb.getAllExpenses(filters as any);
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/api/expenses${query}`);
  },
  
  create: async (expense: { amount: number; category?: string; note?: string; related_product_id?: string; datetime?: string }) => {
    if (USE_LOCAL) return localDb.createExpense(expense);
    return apiCall('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },
  
  delete: async (id: string) => {
    if (USE_LOCAL) return localDb.deleteExpense(id);
    return apiCall(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};

// Teachers API (local only for now - add backend routes if needed)
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

// Categories API (local only for now - add backend routes if needed)
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
