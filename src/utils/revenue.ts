import type { Transaction } from '../App';

/** Wallet cashback a sale earned (0 for non-student or older sales). */
export const cashbackOf = (tx: Pick<Transaction, 'cashbackEarned'>) => Number(tx.cashbackEarned || 0);

/** What the store actually keeps from a sale: the total minus the cashback it gave back. */
export const netRevenue = (tx: Pick<Transaction, 'total' | 'cashbackEarned'>) => tx.total - cashbackOf(tx);
