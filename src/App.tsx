import { useState, useEffect, useRef, useCallback } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { TopBar } from './components/TopBar';
import { CashierPage } from './components/cashier/CashierPage';
import { InventoryPage } from './components/inventory/InventoryPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { StudentManagement } from './components/StudentManagement';
import { GradesPage } from './components/grades/GradesPage';
import { StatisticPage } from './components/statistic/StatisticPage';
import { productsAPI, studentsAPI, salesAPI, expensesAPI, teachersAPI, categoriesAPI } from './services/api';
import { localDb } from './services/localDb';

export interface Product {
  id: string;
  sku?: string;
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
  barcode?: string;
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
  customerType?: 'student' | 'teacher';
  customerId?: string;
  customerName?: string;
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
  purchaseQuantity?: number;
  receiptRef?: string;
}

const DEFAULT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'schoolstore';
const DEFAULT_TIMEOUT_MINUTES = 10;
const LUNCH_TIMEOUT_MINUTES = 40;

const getInactivityTimeoutMs = (date: Date = new Date()) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const isLunchWindow = hour === 12 && minute < 40;
  const timeoutMinutes = isLunchWindow ? LUNCH_TIMEOUT_MINUTES : DEFAULT_TIMEOUT_MINUTES;
  return timeoutMinutes * 60 * 1000;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [currentPage, setCurrentPage] = useState<'cashier' | 'inventory' | 'budget' | 'students' | 'grades' | 'statistic'>('cashier');
  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<StockAdjustment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const lastActivityAtRef = useRef(Date.now());

  const normalizeTransactionCustomer = useCallback((transaction: any) => {
    const customerId = transaction.customerId ?? transaction.studentId ?? undefined;
    const customerType = transaction.customerType ?? undefined;
    return {
      customerType,
      customerId,
      customerName: transaction.customerName ?? transaction.studentName ?? undefined,
    } as Pick<Transaction, 'customerType' | 'customerId' | 'customerName'>;
  }, []);

  // Check saved auth on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('schoolstore_auth') === 'ok') {
        setIsAuthenticated(true);
      }
    } catch {}
    setCheckingAuth(false);
  }, []);

  const handlePasswordSubmit = () => {
    if (passwordInput === DEFAULT_PASSWORD) {
      setIsAuthenticated(true);
      lastActivityAtRef.current = Date.now();
      try {
        localStorage.setItem('schoolstore_auth', 'ok');
      } catch {}
      setPasswordInput('');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleLogout = useCallback((reason: 'manual' | 'timeout' = 'manual') => {
    try {
      localStorage.removeItem('schoolstore_auth');
    } catch {}
    setIsAuthenticated(false);
    setPasswordInput('');
    toast.success(reason === 'timeout' ? 'Session timed out. Please enter password again.' : 'Logged out');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityAtRef.current;
      const timeoutMs = getInactivityTimeoutMs(new Date(now));

      if (elapsed >= timeoutMs) {
        handleLogout('timeout');
      }
    }, 15 * 1000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, handleLogout]);

  // Fetch initial data
  useEffect(() => {
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

        const productById = new Map<string, any>(
          (productsData as any[]).map(p => [p.id, p])
        );

        // Transform transactions
        setTransactions((transactionsData as any[]).map(tx => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
          ...normalizeTransactionCustomer(tx),
          items: (tx.items || []).map((item: any) => {
            const catalogProduct = productById.get(item.productId);

            return {
              product: {
                id: item.productId,
                name: item.productName || catalogProduct?.name || item.productId,
                price: item.unitPrice ?? catalogProduct?.price ?? 0,
                unitCost:
                  item.unitCostAtSale ??
                  catalogProduct?.unitCost ??
                  catalogProduct?.unit_cost ??
                  0,
                description: catalogProduct?.description ?? '',
                category: catalogProduct?.category ?? '',
                stock: catalogProduct?.stock ?? 0,
                reorderLevel:
                  catalogProduct?.reorderLevel ??
                  catalogProduct?.reorder_level ??
                  0,
                sku: catalogProduct?.sku ?? '',
              },
              quantity: item.quantity,
            };
          }),
        })));

        // Transform expenses
        setExpenses((expensesData as any[]).map(exp => ({
          ...exp,
          date: new Date(exp.datetime),
          productId: exp.related_product_id,
          purchaseQuantity: exp.purchase_quantity,
        })));

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data. Using offline mode.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [normalizeTransactionCustomer]);

  const handleAddTransaction = async (transaction: Transaction) => {
    if (!transaction.customerType || !transaction.customerId) {
      throw new Error('Please associate the sale with a customer before completing the transaction.');
    }

    // Prepare sale data for API
    const saleData = {
      customerType: transaction.customerType,
      customerId: transaction.customerId,
      customerName:
        transaction.customerName ||
        (transaction.customerType === 'student'
          ? students.find((s: Student) => s.id === transaction.customerId)?.name || null
          : teachers.find((t: any) => t.id === transaction.customerId)?.name || null),
      items: transaction.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        unitCostAtSale: item.product.unitCost,
      })),
      paymentMethod: transaction.paymentMethod,
      timestamp: transaction.timestamp.toISOString(),
    };

    try {
      const result = await salesAPI.create(saleData) as any;

      if (!result?.ok || !result?.transaction) {
        throw new Error('Failed to complete transaction');
      }

      // Transform API response to frontend format
      const newTransaction: Transaction = {
        id: result.transaction.id,
        timestamp: new Date(result.transaction.timestamp),
        items: result.transaction.items.map((item: any) => {
          const catalogProduct = products.find(p => p.id === item.productId);

          return {
            product: {
              id: item.productId,
              name: item.productName || catalogProduct?.name || item.productId,
              price: item.unitPrice ?? catalogProduct?.price ?? 0,
              unitCost:
                item.unitCostAtSale ??
                catalogProduct?.unitCost ??
                catalogProduct?.unit_cost ??
                0,
              description: catalogProduct?.description ?? '',
              category: catalogProduct?.category ?? '',
              stock: catalogProduct?.stock ?? 0,
              reorderLevel: catalogProduct?.reorderLevel ?? 0,
              sku: catalogProduct?.sku ?? '',
            },
            quantity: item.quantity,
          };
        }),
        subtotal: result.transaction.total,
        tax: 0,
        total: result.transaction.total,
        paymentMethod: result.transaction.paymentMethod as any,
        ...normalizeTransactionCustomer(result.transaction),
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
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      throw new Error(error?.message || 'Failed to complete transaction');
    }
  };

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    const previousProducts = products;

    // Update local state immediately for UI responsiveness
    setProducts(updatedProducts);

    const previousById = new Map(previousProducts.map((product: Product) => [product.id, product]));
    const updatedById = new Map(updatedProducts.map((product: Product) => [product.id, product]));
    const deletedIds = previousProducts
      .filter((product: Product) => !updatedById.has(product.id))
      .map((product: Product) => product.id);
    const changedProducts = updatedProducts.filter((product: Product) => {
      const previousProduct = previousById.get(product.id);

      if (!previousProduct) {
        return false;
      }

      return (
        previousProduct.name !== product.name ||
        previousProduct.price !== product.price ||
        previousProduct.unitCost !== product.unitCost ||
        previousProduct.stock !== product.stock ||
        previousProduct.category !== product.category ||
        previousProduct.description !== product.description ||
        previousProduct.reorderLevel !== product.reorderLevel ||
        previousProduct.supplier !== product.supplier ||
        previousProduct.barcode !== product.barcode
      );
    });

    // Sync API with changed existing products and deletes.
    // New products are already persisted by AddProductModal via productsAPI.create.
    try {
      await Promise.all(
        changedProducts.map(product =>
          productsAPI.update(product.id, {
            name: product.name,
            price: product.price,
            unit_cost: product.unitCost,
            stock: product.stock,
            category: product.category,
            description: product.description,
            reorderLevel: product.reorderLevel,
            supplier: product.supplier,
            barcode: product.barcode,
          })
        )
      );

      await Promise.all(deletedIds.map((id: string) => productsAPI.delete(id)));
    } catch (error) {
      console.error('Error updating products:', error);
      setProducts(previousProducts);
      toast.error('Failed to sync product updates');
      throw error;
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

      if (adjustment.reason === 'restock' && adjustment.unitCost !== undefined && adjustment.quantity > 0) {
        const restockExpense: Expense = {
          id: `exp${Date.now()}`,
          date: adjustment.date,
          category: 'Inventory Purchase',
          amount: adjustment.quantity * adjustment.unitCost,
          note: adjustment.reference || `Inventory restock for ${products.find((p: Product) => p.id === adjustment.productId)?.name || 'product'}`,
          productId: adjustment.productId,
          purchaseQuantity: adjustment.quantity,
        };

        const expenseResult = await expensesAPI.create({
          amount: restockExpense.amount,
          category: restockExpense.category,
          note: restockExpense.note,
          related_product_id: restockExpense.productId,
          purchase_quantity: restockExpense.purchaseQuantity,
          datetime: restockExpense.date.toISOString(),
        }) as any;

        if (!expenseResult?.id || typeof expenseResult.id !== 'string') {
          toast.error('Restock expense was not saved correctly; please add the expense manually.');
        } else {
          setExpenses((prev: Expense[]) => [{ ...restockExpense, id: expenseResult.id }, ...prev]);
        }
      }

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
        purchase_quantity: expense.purchaseQuantity,
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
    const previousStudents = students;

    // Update local state immediately for UI responsiveness
    setStudents(updatedStudents);

    const previousById = new Map(previousStudents.map((student: Student) => [student.id, student]));
    const updatedById = new Map(updatedStudents.map((student: Student) => [student.id, student]));

    const deletedIds = previousStudents
      .filter((student: Student) => !updatedById.has(student.id))
      .map((student: Student) => student.id);

    const createdStudents = updatedStudents.filter((student: Student) => !previousById.has(student.id));

    const changedStudents = updatedStudents.filter((student: Student) => {
      const previousStudent = previousById.get(student.id);

      if (!previousStudent) {
        return false;
      }

      return (
        previousStudent.name !== student.name ||
        previousStudent.grade !== student.grade ||
        previousStudent.gender !== student.gender ||
        previousStudent.barcode !== student.barcode
      );
    });

    try {
      await Promise.all(
        changedStudents.map((student: Student) =>
          studentsAPI.update(student.id, {
            name: student.name,
            grade: student.grade,
            gender: student.gender,
            barcode: student.barcode,
          })
        )
      );

      await Promise.all(
        createdStudents.map((student: Student) =>
          studentsAPI.create({
            id: student.id,
            name: student.name,
            grade: student.grade,
            gender: student.gender,
            barcode: student.barcode,
          })
        )
      );

      await Promise.all(deletedIds.map((id: string) => studentsAPI.delete(id)));
    } catch (error) {
      console.error('Error updating students:', error);
      setStudents(previousStudents);
      toast.error('Failed to sync student updates');
      throw error;
    }
  };

  if (checkingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm space-y-4">
            <h1 className="text-lg font-semibold text-gray-900 text-center">School Store</h1>
            <p className="text-sm text-gray-600 text-center">Enter password to access</p>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              onClick={handlePasswordSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded"
            >
              Enter
            </button>
          </div>
        </div>
        <Toaster />
      </>
    );
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
        onLogout={handleLogout}
      />
      
      {currentPage === 'cashier' && (
        <CashierPage 
          products={products}
          students={students}
          teachers={teachers}
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
          teachers={teachers}
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

      {currentPage === 'statistic' && (
        <StatisticPage
          transactions={transactions}
          products={products}
          students={students}
        />
      )}
      
      <Toaster />
    </div>
  );
}
