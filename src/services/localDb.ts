import { mockProducts, mockStudents, mockTeachers } from '../data/mockData';
import type { Product, Student } from '../App';

const DB_NAME = 'schoolstore-db';
const DB_VERSION = 3;
const STORE_PRODUCTS = 'products';
const STORE_STUDENTS = 'students';
const STORE_TEACHERS = 'teachers';
const STORE_TRANSACTIONS = 'transactions';
const STORE_EXPENSES = 'expenses';
const STORE_CATEGORIES = 'categories';
const STORE_STOCK_ADJUSTMENTS = 'stock_adjustments';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TEACHERS)) {
        db.createObjectStore(STORE_TEACHERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
        db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STOCK_ADJUSTMENTS)) {
        db.createObjectStore(STORE_STOCK_ADJUSTMENTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function runTransaction<T>(storeNames: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    fn(tx).then(result => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    }).catch(err => {
      tx.abort();
      reject(err);
    });
  });
}

async function seedIfEmpty() {
  // If the skip-seed flag is set, don't auto-seed the DB (useful after a manual clear)
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('localDb.skipSeed') === '1') {
      return;
    }
  } catch (e) {
    // ignore
  }
  const db = await openDB();
  const tx = db.transaction([STORE_PRODUCTS, STORE_STUDENTS, STORE_TEACHERS, STORE_CATEGORIES], 'readonly');
  const prodStore = tx.objectStore(STORE_PRODUCTS);
  const stuStore = tx.objectStore(STORE_STUDENTS);
  const teachStore = tx.objectStore(STORE_TEACHERS);
  const catStore = tx.objectStore(STORE_CATEGORIES);

  const prodCountReq = prodStore.count();
  const stuCountReq = stuStore.count();
  const teachCountReq = teachStore.count();
  const catCountReq = catStore.count();

  await new Promise<void>((resolve, reject) => {
    prodCountReq.onsuccess = () => {
      const pCount = prodCountReq.result;
      stuCountReq.onsuccess = () => {
        const sCount = stuCountReq.result;
        teachCountReq.onsuccess = () => {
          const tCount = teachCountReq.result;
          catCountReq.onsuccess = () => {
            const cCount = catCountReq.result;
            // Seed stores independently if empty
            const pendingWrites: Promise<void>[] = [];
            if (pCount === 0) {
              pendingWrites.push(new Promise((res, rej) => {
                const wtx = db.transaction([STORE_PRODUCTS], 'readwrite');
                const pstore = wtx.objectStore(STORE_PRODUCTS);
                for (const p of mockProducts) pstore.put(p as any);
                wtx.oncomplete = () => res();
                wtx.onerror = () => rej(wtx.error);
              }));
            }
            if (sCount === 0) {
              pendingWrites.push(new Promise((res, rej) => {
                const wtx = db.transaction([STORE_STUDENTS], 'readwrite');
                const sstore = wtx.objectStore(STORE_STUDENTS);
                for (const s of mockStudents) sstore.put(s as any);
                wtx.oncomplete = () => res();
                wtx.onerror = () => rej(wtx.error);
              }));
            }
            if (tCount === 0) {
              pendingWrites.push(new Promise((res, rej) => {
                const wtx = db.transaction([STORE_TEACHERS], 'readwrite');
                const tstore = wtx.objectStore(STORE_TEACHERS);
                for (const t of mockTeachers) tstore.put(t as any);
                wtx.oncomplete = () => res();
                wtx.onerror = () => rej(wtx.error);
              }));
            }
            if (cCount === 0) {
              pendingWrites.push(new Promise((res, rej) => {
                const wtx = db.transaction([STORE_CATEGORIES], 'readwrite');
                const cstore = wtx.objectStore(STORE_CATEGORIES);
                // derive categories from mockProducts
                try {
                  const cats = Array.from(new Set((mockProducts || []).map(p => (p as any).category).filter(Boolean)));
                  for (const cat of cats) {
                    const id = `cat-${String(cat).toLowerCase().replace(/\s+/g, '-')}`;
                    cstore.put({ id, name: cat });
                  }
                } catch (e) {
                  // ignore
                }
                wtx.oncomplete = () => res();
                wtx.onerror = () => rej(wtx.error);
              }));
            }

            if (pendingWrites.length === 0) {
              resolve();
            } else {
              Promise.all(pendingWrites).then(() => resolve()).catch(err => reject(err));
            }
          };
          catCountReq.onerror = () => reject(catCountReq.error);
        };
        teachCountReq.onerror = () => reject(teachCountReq.error);
      };
      stuCountReq.onerror = () => reject(stuCountReq.error);
    };
    prodCountReq.onerror = () => reject(prodCountReq.error);
  });
}

// util to promisify requests
function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localDb = {
  init: async () => {
    await seedIfEmpty();
  },

  // Delete the entire IndexedDB database. If `skipSeed` is true, set a flag
  // so the app won't auto-seed on next init (useful for starting from a clean slate).
  clearAll: async (skipSeed = false) => {
    return new Promise<void>((resolve, reject) => {
      try {
        if (typeof localStorage !== 'undefined') {
          if (skipSeed) localStorage.setItem('localDb.skipSeed', '1');
          else localStorage.removeItem('localDb.skipSeed');
        }
      } catch (e) {
        // ignore localStorage errors
      }

      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        // If blocked, still resolve after a short delay to avoid hanging UI
        setTimeout(() => resolve(), 500);
      };
    });
  },

  // Allow seeding again (removes the skip flag)
  allowSeed: async () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('localDb.skipSeed');
    } catch (e) {
      // ignore
    }
  },

  // Products
  getAllProducts: async (): Promise<Product[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readonly');
    const store = tx.objectStore(STORE_PRODUCTS);
    const req = store.getAll();
    return reqToPromise(req) as Promise<Product[]>;
  },
  getProductById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readonly');
    const store = tx.objectStore(STORE_PRODUCTS);
    return reqToPromise(store.get(id)) as Promise<any>;
  },
  createProduct: async (product: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const id = product.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const toPut = { ...product, id };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateProduct: async (id: string, product: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = { ...existing, ...product, id };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  adjustStock: async (id: string, adjustment: { change: number; reason?: string; unit_cost?: number; reference?: string; user?: string }) => {
    const db = await openDB();
    const tx = db.transaction([STORE_PRODUCTS, STORE_STOCK_ADJUSTMENTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const stockAdjustmentsStore = tx.objectStore(STORE_STOCK_ADJUSTMENTS);
    const existing = await reqToPromise(store.get(id)) as any;
    if (!existing) throw new Error('Product not found');
    const newStock = (existing.stock || 0) + (adjustment.change || 0);
    existing.stock = newStock;
    if (adjustment.unit_cost !== undefined) existing.unit_cost = adjustment.unit_cost;
    store.put(existing);
    const adjustmentRecord = {
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: id,
      date: new Date().toISOString(),
      quantity: adjustment.change || 0,
      reason: adjustment.reason || 'correction',
      reference: adjustment.reference,
      unitCost: adjustment.unit_cost,
      user: adjustment.user || 'system',
    };
    stockAdjustmentsStore.put(adjustmentRecord);
    return new Promise(resolve => {
      tx.oncomplete = () => resolve({
        stock: existing.stock,
        unit_cost: existing.unit_cost,
        adjustment: adjustmentRecord,
      });
    });
  },
  getAllStockAdjustments: async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_STOCK_ADJUSTMENTS, 'readonly');
    const store = tx.objectStore(STORE_STOCK_ADJUSTMENTS);
    return reqToPromise(store.getAll()) as Promise<any[]>;
  },

  // Students
  getAllStudents: async (): Promise<Student[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readonly');
    const store = tx.objectStore(STORE_STUDENTS);
    return reqToPromise(store.getAll()) as Promise<Student[]>;
  },
  getStudentById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readonly');
    const store = tx.objectStore(STORE_STUDENTS);
    return reqToPromise(store.get(id)) as Promise<any>;
  },
  createStudent: async (student: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);
    const id = student.id || `stu-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const toPut = { ...student, id };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateStudent: async (id: string, student: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = { ...existing, ...student, id };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteStudent: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);
    store.delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },
  getPurchasesByStudent: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const all = await reqToPromise(store.getAll()) as any[];
    return all.filter(t => t.studentId === id || t.studentId === String(id));
  },

  // Teachers
  getAllTeachers: async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readonly');
    const store = tx.objectStore(STORE_TEACHERS);
    return reqToPromise(store.getAll()) as Promise<any[]>;
  },
  getTeacherById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readonly');
    const store = tx.objectStore(STORE_TEACHERS);
    return reqToPromise(store.get(id)) as Promise<any>;
  },
  createTeacher: async (teacher: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readwrite');
    const store = tx.objectStore(STORE_TEACHERS);
    const id = teacher.id || `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const toPut = { ...teacher, id };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateTeacher: async (id: string, teacher: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readwrite');
    const store = tx.objectStore(STORE_TEACHERS);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = { ...existing, ...teacher, id };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteTeacher: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readwrite');
    const store = tx.objectStore(STORE_TEACHERS);
    store.delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },

  // Categories
  getAllCategories: async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    const store = tx.objectStore(STORE_CATEGORIES);
    return reqToPromise(store.getAll()) as Promise<any[]>;
  },
  getCategoryById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    const store = tx.objectStore(STORE_CATEGORIES);
    return reqToPromise(store.get(id)) as Promise<any>;
  },
  createCategory: async (cat: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const id = cat.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const toPut = { ...cat, id };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateCategory: async (id: string, cat: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = { ...existing, ...cat, id };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteCategory: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    store.delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },

  // Transactions / Sales
  createTransaction: async (sale: any) => {
    // sale: { studentId?, studentName?, items, paymentMethod, timestamp }
    const db = await openDB();
    const ttx = db.transaction([STORE_TRANSACTIONS, STORE_PRODUCTS, STORE_STUDENTS], 'readwrite');
    const transStore = ttx.objectStore(STORE_TRANSACTIONS);
    const prodStore = ttx.objectStore(STORE_PRODUCTS);
    const stuStore = ttx.objectStore(STORE_STUDENTS);

    // Validate and update stock
    const total = (sale.items || []).reduce((sum: number, it: any) => sum + (it.unitPrice || 0) * (it.quantity || 0), 0);

    // reduce stock
    for (const item of sale.items || []) {
      const product = await reqToPromise(prodStore.get(item.productId)) as any;
      if (!product) throw new Error('Product not found');
      product.stock = (product.stock || 0) - (item.quantity || 0);
      prodStore.put(product);
    }

    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const transaction = {
      id,
      timestamp: sale.timestamp || new Date().toISOString(),
      items: sale.items || [],
      total,
      paymentMethod: sale.paymentMethod,
      studentId: sale.studentId || null,
    };

    transStore.put(transaction);
    return new Promise(resolve => { ttx.oncomplete = () => resolve({ ok: true, transaction }); });
  },
  getAllTransactions: async (filters?: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const all = await reqToPromise(store.getAll()) as any[];
    if (!filters) return all;
    let res = all;
    if (filters.studentId) res = res.filter(r => r.studentId === filters.studentId);
    if (filters.start) res = res.filter(r => new Date(r.timestamp) >= new Date(filters.start));
    if (filters.end) res = res.filter(r => new Date(r.timestamp) <= new Date(filters.end));
    return res;
  },

  // Expenses
  getAllExpenses: async (filters?: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readonly');
    const store = tx.objectStore(STORE_EXPENSES);
    const all = await reqToPromise(store.getAll()) as any[];
    if (!filters) return all;
    let res = all;
    if (filters.start) res = res.filter(r => new Date(r.datetime) >= new Date(filters.start));
    if (filters.end) res = res.filter(r => new Date(r.datetime) <= new Date(filters.end));
    return res;
  },
  createExpense: async (expense: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readwrite');
    const store = tx.objectStore(STORE_EXPENSES);
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const e = { ...expense, id };
    store.put(e);
    return new Promise(resolve => { tx.oncomplete = () => resolve(e); });
  },
  deleteExpense: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readwrite');
    const store = tx.objectStore(STORE_EXPENSES);
    store.delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  }
};
