import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { TopBar } from './components/TopBar';
import { CashierPage } from './components/cashier/CashierPage';
import { InventoryPage } from './components/inventory/InventoryPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { StudentManagement } from './components/StudentManagement';
import { GradesPage } from './components/grades/GradesPage';
import { productsAPI, studentsAPI, salesAPI, expensesAPI, teachersAPI, categoriesAPI } from './services/api';
import { localDb } from './services/localDb';
import { setCurrency, type CurrencyCode } from './utils/formatCurrency';

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  unitCost: number;
  description: string;
  category: string;
  stock: number;
  reorderLevel: number;
  supplier?: string;
  lastRestock?: Date;
  barcode?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  gender?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: Date;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  studentId?: string;
  cashReceived?: number;
  change?: number;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  date: Date;
  quantity: number;
  reason: 'restock' | 'correction' | 'damage' | 'return';
  reference?: string;
  unitCost?: number;
  user: string;
}

export interface Expense {
  id: string;
  date: Date;
  category: string;
  amount: number;
  note: string;
  productId?: string;
  receiptRef?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'cashier' | 'inventory' | 'budget' | 'students' | 'grades'>('cashier');
  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<StockAdjustment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Currency state
  const [currency, setCurrencyState] = useState<CurrencyCode>('KRW');

  useEffect(() => {
    setCurrency(currency);
  }, [currency]);

  // Backend authentication check
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check backend authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/ping`, {
          credentials: 'include', // Include session cookie
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else if (response.status === 401) {
          // Not authenticated, redirect to backend login
          window.location.href = `${apiUrl}/login`;
          return;
        } else {
          // Other error, try to redirect anyway
          window.location.href = `${apiUrl}/login`;
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // If backend is not available, redirect to login
        const apiUrl = import.meta.env.VITE_API_URL || '';
        window.location.href = `${apiUrl}/login`;
        return;
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (!isAuthenticated) return; // Don't fetch data if not authenticated
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, studentsData, transactionsData, expensesData, teachersData, categoriesData] = await Promise.all([
          productsAPI.getAll(),
          studentsAPI.getAll(),
          salesAPI.getAll(),
          expensesAPI.getAll(),
          teachersAPI.getAll(),
          categoriesAPI.getAll(),
        ]);

        // Transform API data to match frontend types
        setProducts((productsData as any[]).map(p => ({
          ...p,
          unitCost: p.unit_cost || 0,
          reorderLevel: p.reorder_level || 0,
          lastRestock: p.lastRestock ? new Date(p.lastRestock) : undefined,
        })));

        setStudents(studentsData as Student[]);

        setTeachers(teachersData as any[]);
        setCategories(categoriesData as any[]);

        // Transform transactions
        setTransactions((transactionsData as any[]).map(tx => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
          items: (tx.items || []).map((item: any) => ({
            product: {
              id: item.productId,
              name: item.productName,
              price: item.unitPrice,
              unitCost: item.unitCostAtSale || 0,
              description: '',
              category: '',
              stock: 0,
              reorderLevel: 0,
              sku: '',
            },
            quantity: item.quantity,
          })),
        })));

        // Transform expenses
        setExpenses((expensesData as any[]).map(exp => ({
          ...exp,
          date: new Date(exp.datetime),
          productId: exp.related_product_id,
        })));

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data. Using offline mode.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddTransaction = async (transaction: Transaction) => {
    try {
      if (!transaction.studentId) {
        toast.error('Please associate the sale with a customer before completing the transaction.');
        return;
      }
      // Prepare sale data for API
      const saleData = {
        studentId: transaction.studentId || null,
        studentName: transaction.studentId ? students.find((s: Student) => s.id === transaction.studentId)?.name || null : null,
        items: transaction.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        paymentMethod: transaction.paymentMethod,
        timestamp: transaction.timestamp.toISOString(),
      };

      const result = await salesAPI.create(saleData) as any;
      
      if (result.ok && result.transaction) {
        // Transform API response to frontend format
        const newTransaction: Transaction = {
          id: result.transaction.id,
          timestamp: new Date(result.transaction.timestamp),
          items: result.transaction.items.map((item: any) => ({
            product: {
              id: item.productId,
              name: item.productName,
              price: item.unitPrice,
              unitCost: item.unitCostAtSale || 0,
              description: '',
              category: '',
              stock: 0,
              reorderLevel: 0,
              sku: '',
            },
            quantity: item.quantity,
          })),
          subtotal: result.transaction.total,
          tax: 0,
          total: result.transaction.total,
          paymentMethod: result.transaction.paymentMethod as any,
          studentId: result.transaction.studentId || undefined,
        };

        setTransactions((prev: Transaction[]) => [newTransaction, ...prev]);
        
        // Refresh products to get updated stock
        const updatedProducts = await productsAPI.getAll() as any[];
        setProducts(updatedProducts.map(p => ({
          ...p,
          unitCost: p.unit_cost || 0,
          reorderLevel: p.reorder_level || 0,
          lastRestock: p.lastRestock ? new Date(p.lastRestock) : undefined,
        })));

        toast.success('Transaction completed successfully!');
      }
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.message || 'Failed to complete transaction');
    }
  };

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    // Update local state immediately for UI responsiveness
    setProducts(updatedProducts);
    
    // Sync with API for each updated product
    try {
      await Promise.all(
        updatedProducts.map(product =>
          productsAPI.update(product.id, {
            name: product.name,
            price: product.price,
            unit_cost: product.unitCost,
            stock: product.stock,
            category: product.category,
            sku: product.sku,
            description: product.description,
            reorderLevel: product.reorderLevel,
            supplier: product.supplier,
            barcode: product.barcode,
          })
        )
      );
    } catch (error) {
      console.error('Error updating products:', error);
      toast.error('Failed to sync product updates');
    }
  };

  const handleAddStockAdjustment = async (adjustment: StockAdjustment) => {
    try {
      const result = await productsAPI.adjustStock(adjustment.productId, {
        change: adjustment.quantity,
        reason: adjustment.reason,
        unit_cost: adjustment.unitCost,
        reference: adjustment.reference,
        user: adjustment.user,
      }) as any;

      // Update local state
      setStockHistory((prev: StockAdjustment[]) => [...prev, adjustment]);
      
      const updatedProducts = products.map((product: Product) => {
        if (product.id === adjustment.productId) {
          return { 
            ...product, 
            stock: result.stock,
            unitCost: result.unit_cost || product.unitCost,
            lastRestock: adjustment.reason === 'restock' ? new Date() : product.lastRestock
          };
        }
        return product;
      });
      setProducts(updatedProducts);

      toast.success('Stock adjusted successfully');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast.error(error.message || 'Failed to adjust stock');
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    try {
      const result = await expensesAPI.create({
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        related_product_id: expense.productId,
        datetime: expense.date.toISOString(),
      }) as any;

      const newExpense: Expense = {
        ...expense,
        id: result.id,
      };

      setExpenses((prev: Expense[]) => [newExpense, ...prev]);
      toast.success('Expense added successfully');
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense');
    }
  };

  const handleCreateCategory = async (name: string) => {
    try {
      const created = await categoriesAPI.create(name);
      const all = await categoriesAPI.getAll();
      setCategories(all as any[]);
      return created;
    } catch (e) {
      console.error('Error creating category', e);
      throw e;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoriesAPI.delete(id);
      const all = await categoriesAPI.getAll();
      setCategories(all as any[]);
    } catch (e) {
      console.error('Error deleting category', e);
      throw e;
    }
  };

  const handleCreateTeacher = async (teacher: any) => {
    try {
      const created = await teachersAPI.create(teacher);
      const all = await teachersAPI.getAll();
      setTeachers(all as any[]);
      return created;
    } catch (e) {
      console.error('Error creating teacher', e);
      throw e;
    }
  };

  const handleUpdateTeacher = async (id: string, data: any) => {
    try {
      const updated = await teachersAPI.update(id, data);
      const all = await teachersAPI.getAll();
      setTeachers(all as any[]);
      return updated;
    } catch (e) {
      console.error('Error updating teacher', e);
      throw e;
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await teachersAPI.delete(id);
      const all = await teachersAPI.getAll();
      setTeachers(all as any[]);
    } catch (e) {
      console.error('Error deleting teacher', e);
      throw e;
    }
  };

  const handleUpdateStudents = async (updatedStudents: Student[]) => {
    // Update local state immediately
    setStudents(updatedStudents);
    
    // Sync with API (students are managed in StudentManagement component)
    // This is mainly for local state updates
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This should not happen as auth check redirects on failure,
    // but if it does, redirect to login as a fallback
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/login`;
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        currency={currency}
        onCurrencyChange={setCurrencyState}
      />
      
      {currentPage === 'cashier' && (
        <CashierPage 
          products={products}
          students={students}
          onAddTransaction={handleAddTransaction}
        />
      )}
      
      {currentPage === 'inventory' && (
        <InventoryPage 
          products={products}
          stockHistory={stockHistory}
          onUpdateProducts={handleUpdateProducts}
          onAddStockAdjustment={handleAddStockAdjustment}
          categories={categories}
          onCreateCategory={handleCreateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}
      
      {currentPage === 'budget' && (
        <BudgetPage 
          transactions={transactions}
          expenses={expenses}
          products={products}
          students={students}
          onAddExpense={handleAddExpense}
        />
      )}

      {currentPage === 'students' && (
        <StudentManagement 
          students={students}
          onUpdateStudents={handleUpdateStudents}
        />
      )}

      {currentPage === 'grades' && (
        <GradesPage 
          transactions={transactions}
          students={students}
          teachers={teachers}
          onCreateTeacher={handleCreateTeacher}
          onUpdateTeacher={handleUpdateTeacher}
          onDeleteTeacher={handleDeleteTeacher}
        />
      )}
      
      <Toaster />
    </div>
  );
}
