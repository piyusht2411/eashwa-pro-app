import type { ExpenseItem } from '@/types';

/**
 * Reading an expense item's two payer portions.
 *
 * An expense is split across who actually settled it: `driverAmount` is out of
 * the driver's pocket and has to be reimbursed, `companyAmount` was paid
 * directly by the company and needs no approval. One bill can carry both.
 *
 * Records written before the split hold a single `amount` with a `paidBy` flag.
 * The server backfills those on read, but these helpers cover them too so a
 * cached or older response never renders a blank figure.
 */

type ItemLike = Partial<ExpenseItem> | null | undefined;

const num = (value: unknown) => Number(value) || 0;

export const driverAmountOf = (item: ItemLike): number => {
  if (!item) return 0;
  if (item.driverAmount !== undefined && item.driverAmount !== null) return num(item.driverAmount);
  return item.paidBy === 'company' ? 0 : num(item.amount);
};

export const companyAmountOf = (item: ItemLike): number => {
  if (!item) return 0;
  if (item.companyAmount !== undefined && item.companyAmount !== null) return num(item.companyAmount);
  return item.paidBy === 'company' ? num(item.amount) : 0;
};

/** The whole bill, whoever settled which part of it. */
export const itemTotal = (item: ItemLike): number =>
  driverAmountOf(item) + companyAmountOf(item);

/** True when there is driver money on this item waiting for a decision. */
export const isAwaitingApproval = (item: ItemLike): boolean =>
  item?.status === 'pending' && driverAmountOf(item) > 0;
