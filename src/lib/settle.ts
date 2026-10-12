import type {
  Expense,
  Ledger,
  Payment,
  PersonBalance,
  Transfer,
} from "@/lib/types";

export function netBalances(
  expenses: Expense[],
  payments: Payment[],
): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (personId: string, delta: number) => {
    totals.set(personId, (totals.get(personId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    add(expense.paidById, expense.amountCents);
    for (const share of expense.shares) {
      add(share.personId, -share.amountCents);
    }
  }

  for (const payment of payments) {
    add(payment.fromId, payment.amountCents);
    add(payment.toId, -payment.amountCents);
  }

  return totals;
}

export function settleBalances(balances: Map<string, number>): Transfer[] {
  const debtors = [...balances.entries()]
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, cents: -cents }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));
  const creditors = [...balances.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, cents }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amountCents = Math.min(
      debtors[debtorIndex].cents,
      creditors[creditorIndex].cents,
    );
    if (amountCents > 0) {
      transfers.push({
        fromId: debtors[debtorIndex].id,
        toId: creditors[creditorIndex].id,
        amountCents,
      });
    }
    debtors[debtorIndex].cents -= amountCents;
    creditors[creditorIndex].cents -= amountCents;
    if (debtors[debtorIndex].cents === 0) debtorIndex += 1;
    if (creditors[creditorIndex].cents === 0) creditorIndex += 1;
  }

  return transfers;
}

export function balancesInScope(
  ledger: Ledger,
  groupId: string | null,
): Map<string, number> {
  const expenses = groupId
    ? ledger.expenses.filter((expense) => expense.groupId === groupId)
    : ledger.expenses;
  const payments = groupId
    ? ledger.payments.filter((payment) => payment.groupId === groupId)
    : ledger.payments;
  return netBalances(expenses, payments);
}

export function settlementFor(ledger: Ledger, groupId: string | null) {
  const totals = balancesInScope(ledger, groupId);
  const balances: PersonBalance[] = [...totals.entries()]
    .map(([personId, balanceCents]) => ({ personId, balanceCents }))
    .filter((balance) => balance.balanceCents !== 0)
    .sort((a, b) => b.balanceCents - a.balanceCents || a.personId.localeCompare(b.personId));
  return {
    balances,
    transfers: settleBalances(totals),
  };
}

export function spentCents(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
}

export function unsettledCents(ledger: Ledger, groupId: string | null): number {
  const totals = balancesInScope(ledger, groupId);
  let positive = 0;
  for (const cents of totals.values()) {
    if (cents > 0) positive += cents;
  }
  return positive;
}
