// Drives the demo app (seeded by gen-seed.mjs) through every screen and saves PNGs.
// Usage: node capture.mjs <outDir> [baseUrl]. Uses the installed Google Chrome.
import { chromium } from 'playwright';
import { DEMO_NOW } from './demo-time.mjs';
const out = process.argv[2];
const BASE = process.argv[3] || 'http://localhost:3100/';
const b = await chromium.launch({ channel: 'chrome' });
const W = 1440, H = 900;
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.clock.install({ time: DEMO_NOW });
// Let time run (charts animate on real timers) but start from the demo date.
await p.clock.resume();
const wait = ms => p.waitForTimeout(ms);
const shot = async (name, opts = {}) => { await wait(opts.wait ?? 900); await p.screenshot({ path: `${out}/${name}.png`, ...opts.o }); console.log('shot', name); };
const dshot = async (name) => { await wait(900); const bx = await p.locator('[role=dialog]').last().boundingBox(); const pad = 28; const vp = p.viewportSize();
  const x = Math.max(0, bx.x - pad), y = Math.max(0, bx.y - pad);
  await p.screenshot({ path: `${out}/${name}.png`, clip: { x, y, width: Math.min(vp.width - x, bx.width + 2 * pad), height: Math.min(vp.height - y, bx.height + 2 * pad) } }); console.log('dshot', name); };
const scan = async code => { await p.keyboard.type(code, { delay: 15 }); await p.keyboard.press('Enter'); await wait(700); };
const nav = async name => { await p.getByRole('button', { name, exact: true }).click(); await wait(1500); };

// Lock screen (narrower window)
await p.setViewportSize({ width: 820, height: 560 });
await p.goto(BASE); await wait(2000);
await shot('lock-screen');
// Teacher self-checkout
await p.locator('body').click({ position: { x: 5, y: 5 } });
await scan('2000000000008'); await wait(800);
await p.setViewportSize({ width: W, height: H });
await p.getByText('Banana Milk', { exact: true }).first().click();
await p.getByText('Snacks', { exact: true }).first().click(); await wait(300);
await p.getByText('Honey Butter Chips', { exact: true }).first().click();
await shot('teacher-checkout');
await p.getByRole('button', { name: 'Cancel' }).first().click(); await wait(800);

// Log in without typing the password (works whatever VITE_APP_PASSWORD is)
await p.evaluate(() => localStorage.setItem('schoolstore_auth', 'ok'));
await p.reload(); await wait(2000);

// Charge wallet
await p.getByRole('button', { name: /Charge student wallet/ }).click(); await wait(600);
await scan('20240013');
await p.getByRole('button', { name: /10,000/ }).first().click(); await wait(300);
await dshot('charge-wallet');
await p.getByRole('button', { name: /^Charge ₩/ }).click(); await wait(5500);

// Cart
await p.getByText('Meals', { exact: true }).first().click(); await wait(300);
await p.getByText('Triangle Kimbap Tuna', { exact: true }).first().click();
await p.getByText('Triangle Kimbap Tuna', { exact: true }).first().click();
await p.getByText('Drinks', { exact: true }).first().click(); await wait(300);
await p.getByText('Banana Milk', { exact: true }).first().click();
await p.getByText('Snacks', { exact: true }).first().click(); await wait(300);
await p.getByText('Pepero Original', { exact: true }).first().click();
await p.mouse.move(5, 300);
await shot('cashier');
await p.getByRole('button', { name: /^Purchase/ }).click(); await wait(700);
await dshot('who-is-buying');
await scan('20240013'); await wait(500);
await dshot('pay-from-wallet');
await p.getByRole('button', { name: /from wallet/ }).click(); await wait(1200);
await dshot('receipt');
await p.getByRole('button', { name: /Close & New Transaction/ }).click(); await wait(800);

// Inventory
await nav('Inventory');
await p.getByText('Choco Pie (2)', { exact: true }).first().click(); await p.mouse.move(1430, 60);
await shot('inventory');
await p.getByRole('button', { name: /Edit \/ Restock/ }).click(); await wait(800);
await p.locator('[role=dialog] input').first().evaluate(e => e.blur()); await p.setViewportSize({ width: W, height: 1200 }); await dshot('product-dialog'); await p.setViewportSize({ width: W, height: H });
await p.keyboard.press('Escape'); await wait(500);

// Budget
await nav('Budget');
await p.getByRole('button', { name: 'Last Month', exact: true }).click(); await wait(1500);
await shot('budget');
await p.mouse.wheel(0, 700); await p.mouse.move(1430, 890); await shot('budget-tables');

// People
await nav('People');
await shot('people');
await p.getByText('20240013', { exact: true }).first().click(); await wait(900);
await shot('person-panel');
await p.keyboard.press('Escape'); await wait(500);
await p.getByRole('button', { name: 'Teacher barcode' }).click();
await dshot('teacher-barcode');
await p.keyboard.press('Escape'); await wait(500);
await p.getByRole('button', { name: 'Import CSV' }).click();
await dshot('import-csv');
await p.keyboard.press('Escape'); await wait(500);

// Statistic
await nav('Statistic');
await p.setViewportSize({ width: W, height: 1300 }); await wait(1500);
await shot('stats-sales');
for (const [tab, name] of [['What to sell and restock', 'stats-menu'], ['Customers', 'stats-customers'], ['Busy times and combos', 'stats-busy']]) {
  await p.getByRole('tab', { name: tab }).or(p.getByRole('button', { name: tab })).first().click(); await wait(1800);
  await shot(name);
}
await p.setViewportSize({ width: W, height: H });
// Backup dialog
await p.getByRole('button', { name: /Backup/ }).or(p.locator('button[aria-label*="Backup"]')).first().click().catch(()=>{});
await dshot('backup');
await b.close();
