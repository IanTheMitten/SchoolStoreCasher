// Invented demo dataset for the README screenshots (no real people or sales).
// Writes a backup snapshot in the same shape localDb.exportAll() produces; sales mirror
// localDb.createTransaction (stock movements, wallet payments, 2% cashback).
// Usage: node gen-seed.mjs <out/db.json>
import fs from 'fs';
import { DEMO_NOW } from './demo-time.mjs';
let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const D = d => ({ __date__: new Date(d).toISOString() });
let n = 0; const uid = p => `${p}-demo-${(++n).toString(36)}`;
const ean = () => '880' + Array.from({ length: 10 }, () => Math.floor(rnd() * 10)).join('');

const catalog = [
  ['Snacks', [['Honey Butter Chips', 1500, 900], ['Shrimp Crackers', 1200, 700], ['Choco Pie (2)', 1000, 550], ['Pepero Original', 1500, 850], ['Rice Crackers', 1000, 600], ['Gummy Bears', 800, 450], ['Seaweed Snack', 1000, 550]]],
  ['Drinks', [['Banana Milk', 1500, 950], ['Strawberry Milk', 1500, 950], ['Bottled Water 500ml', 800, 350], ['Orange Juice', 1800, 1100], ['Sports Drink', 1600, 950], ['Iced Tea', 1500, 850]]],
  ['Meals', [['Triangle Kimbap Tuna', 1500, 1000], ['Triangle Kimbap Bulgogi', 1700, 1150], ['Cup Ramen', 1300, 1150], ['Ham Cheese Sandwich', 2500, 1700]]],
  ['Stationery', [['Gel Pen Black', 1000, 400], ['Mechanical Pencil', 2000, 900], ['A5 Notebook', 1500, 700], ['Eraser', 500, 200], ['Highlighter Set', 3000, 1500], ['Sticky Notes', 1200, 500], ['Correction Tape', 1800, 1500]]],
  ['School Goods', [['School Logo Pin', 3000, 1200], ['PE T-shirt', 12000, 7000], ['Lanyard', 2000, 800], ['Winter Scarf', 15000, 9000]]],
];
const categories = catalog.map(([name]) => ({ id: uid('cat'), name }));
const products = [];
for (const [cat, items] of catalog) for (const [name, price, unitCost] of items) {
  products.push({ id: uid('p'), sku: 'SKU-' + (100 + products.length), name, price, unit_cost: unitCost, description: '', category: cat,
    stock: 0, reorder_level: cat === 'School Goods' ? 3 : 10, supplier: cat === 'Stationery' ? 'Morning Glory Wholesale' : cat === 'School Goods' ? 'School Office' : 'Daehan Food Supply', barcode: ean() });
}
const first = ['Minjun','Seoyeon','Jiho','Haeun','Doyun','Jiwoo','Yejun','Sua','Siwoo','Hayoon','Juwon','Chaewon','Eunwoo','Jian','Hyunwoo','Dahyun','Taeyang','Yuna','Gunwoo','Seoa','Jaehyun','Minseo','Woojin','Soyul','Hajun','Yerin','Junseo','Nayeon','Sihoo','Jimin'];
const last = ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon'];
const grades = ['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
const used = new Set(); const uniqName = () => { for (;;) { const nm = `${pick(last)} ${pick(first)}`; if (!used.has(nm)) { used.add(nm); return nm; } } };
const students = Array.from({ length: 72 }, (_, i) => ({ id: uid('s'), name: uniqName(), grade: grades[i % 6], gender: i % 2 ? 'F' : 'M', barcode: String(20240001 + i) }));
const teachers = [['Ms. Han','Math'],['Mr. Oh','Science'],['Ms. Seo','English'],['Mr. Kwon','PE'],['Ms. Yoon','Art'],['Mr. Lim','History']].map(([name, subject], i) => ({ id: uid('t'), name, subject, barcode: String(90000001 + i) }));

const tx = [], adj = [], wallet = [], expenses = [];
const now = new Date(DEMO_NOW.getTime() - 60e3);
const startDay = new Date(now); startDay.setDate(now.getDate() - 55);
// restock everything at start + weekly restock of fast movers
const restock = (p, qty, date) => {
  p.stock += qty; p.unitCost = p.unit_cost;
  adj.push({ id: uid('ADJ'), productId: p.id, date: date.toISOString(), quantity: qty, reason: 'restock', reference: 'INV-' + Math.floor(rnd() * 9000 + 1000), unitCost: p.unitCost, user: 'staff' });
  expenses.push({ id: uid('exp'), datetime: date.toISOString(), category: 'Inventory Purchase', amount: qty * p.unitCost, note: `Restock ${p.name} x${qty}`, related_product_id: p.id, purchase_quantity: qty });
};
for (const p of products) restock(p, p.category === 'School Goods' ? 15 : 60, new Date(startDay.getTime() + 8 * 3600e3));
// wallet charges
const walletKids = students.filter(() => rnd() < 0.35);
const bal = new Map();
const addW = (studentId, type, amount, date, transactionId) => { wallet.push({ id: uid('w'), studentId, date: date.toISOString(), type, amount, ...(transactionId ? { transactionId } : {}) }); bal.set(studentId, (bal.get(studentId) || 0) + amount); };
for (const s of walletKids) addW(s.id, 'charge', pick([5000, 10000, 10000, 20000]), new Date(startDay.getTime() + 9 * 3600e3));
const weights = products.map(p => p.name === 'Winter Scarf' ? 0 : p.name === 'Cup Ramen' ? 9 : p.name === 'Correction Tape' ? 0.4 : ({ Snacks: 5, Drinks: 6, Meals: 4, Stationery: 1.5, 'School Goods': 0.3 })[p.category] * (0.4 + rnd() * 1.4));
const wsum = weights.reduce((a, b) => a + b, 0);
const pickProduct = () => { let r = rnd() * wsum; for (let i = 0; i < products.length; i++) { r -= weights[i]; if (r <= 0) return products[i]; } return products[0]; };
// time slots: morning break 10:40, lunch 12:00-12:40 heavy, afternoon break 14:30, after school 15:20
const slots = [[9, 0, 10, 0.7], [9, 55, 10, 0.9], [10, 50, 10, 1.3], [11, 45, 55, 4], [13, 10, 10, 1.1], [14, 5, 10, 0.9], [15, 0, 10, 0.8], [16, 0, 40, 0.6]];
for (let d = new Date(startDay); d <= now; d.setDate(d.getDate() + 1)) {
  const dow = d.getDay(); if (dow === 0 || dow === 6) continue;
  const dayBoost = [0, 1, 0.9, 1.1, 0.95, 1.3][dow] * (0.8 + rnd() * 0.4);
  if (dow === 1) for (const p of products) if (p.stock < 25 && p.category !== 'School Goods') restock(p, 40, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 50));
  if (dow === 3 && rnd() < 0.6) { const s = pick(walletKids); addW(s.id, 'charge', pick([5000, 10000]), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 5)); }
  for (const [h, m, len, w] of slots) {
    const count = Math.round(w * dayBoost * 4 * (0.7 + rnd() * 0.6));
    for (let k = 0; k < count; k++) {
      const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m + Math.floor(rnd() * len), Math.floor(rnd() * 60));
      if (ts > now) continue;
      const lines = new Map(); const nItems = rnd() < 0.6 ? 1 : rnd() < 0.7 ? 2 : 3;
      for (let j = 0; j < nItems; j++) { const p = pickProduct(); if (p.stock - (lines.get(p) || 0) > 0) lines.set(p, (lines.get(p) || 0) + 1); }
      if (!lines.size) continue;
      const items = [...lines].map(([p, q]) => ({ productId: p.id, productName: p.name, quantity: q, unitPrice: p.price, unitCostAtSale: p.unitCost }));
      const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const r = rnd(); let customerType = null, customerId = null, customerName = null;
      if (r < 0.62) { const s = rnd() < 0.5 ? pick(walletKids) : pick(students); customerType = 'student'; customerId = s.id; customerName = s.name; }
      else if (r < 0.74) { const t = pick(teachers); customerType = 'teacher'; customerId = t.id; customerName = t.name; }
      else if (r < 0.84) { customerType = 'grade'; customerId = customerName = pick(grades); }
      let walletPaid = 0;
      if (customerType === 'student') { const b = bal.get(customerId) || 0; if (b >= 100 && rnd() < 0.8) walletPaid = Math.min(Math.floor(total / 100) * 100, Math.floor(b / 100) * 100); }
      const id = uid('tx');
      for (const it of items) { const p = products.find(p => p.id === it.productId); p.stock -= it.quantity; adj.push({ id: uid('ADJ'), productId: p.id, date: ts.toISOString(), quantity: -it.quantity, reason: 'sale', reference: '', user: 'system' }); }
      const cashbackEarned = customerType === 'student' ? Math.floor(total * 2 / 100) : 0;
      tx.push({ id, timestamp: ts.toISOString(), items, total, paymentMethod: walletPaid > 0 && walletPaid >= total ? 'wallet' : 'cash', customerType, customerId, customerName, walletPaid, cashPaid: total - walletPaid, cashbackEarned });
      if (walletPaid > 0) addW(customerId, 'payment', -walletPaid, ts, id);
      if (cashbackEarned > 0) addW(customerId, 'cashback', cashbackEarned, ts, id);
    }
  }
}
// leave a couple of items low so reorder warnings show
products.find(p => p.name === 'Lanyard').stock = 2; products.find(p => p.name === 'Choco Pie (2)').stock = 4; products.find(p => p.name === 'Winter Scarf').stock = 8;
products.find(p => p.name === 'Highlighter Set').stock = Math.min(products.find(p => p.name === 'Highlighter Set').stock, 6);
expenses.push({ id: uid('exp'), datetime: new Date(startDay.getTime() + 864e5 * 10).toISOString(), category: 'Supplies', amount: 18000, note: 'Receipt paper rolls', receipt_ref: 'R-1042' });
expenses.push({ id: uid('exp'), datetime: new Date(startDay.getTime() + 864e5 * 30).toISOString(), category: 'Equipment', amount: 45000, note: 'Replacement barcode scanner', receipt_ref: 'R-1107' });
for (const p of products) { delete p.unitCost; const last = adj.filter(a => a.productId === p.id && a.reason === 'restock').pop(); p.lastRestock = last.date; p.reorderLevel = p.reorder_level; }
const snap = { app: 'SchoolStoreCasher', schemaVersion: 4, exportedAt: new Date().toISOString(), data: { products, students, teachers, transactions: tx, expenses, categories, inventoryAdjustments: adj, walletEntries: wallet } };
fs.writeFileSync(process.argv[2], JSON.stringify(snap));
console.log({ products: products.length, students: students.length, tx: tx.length, adj: adj.length, wallet: wallet.length, revenue: tx.reduce((s, t) => s + t.total, 0) });
