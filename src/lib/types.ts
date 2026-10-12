export type SplitMode = "equal" | "amounts";

export type Person = {
  id: string;
  name: string;
};

export type Group = {
  id: string;
  name: string;
  memberIds: string[];
};

export type Share = {
  personId: string;
  amountCents: number;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  paidById: string;
  groupId: string;
  split: SplitMode;
  shares: Share[];
  createdAt: string;
};

export type Payment = {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  groupId: string;
  note: string;
  createdAt: string;
};

export type Ledger = {
  version: 1;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  payments: Payment[];
};

export type Transfer = {
  fromId: string;
  toId: string;
  amountCents: number;
};

export type PersonBalance = {
  personId: string;
  balanceCents: number;
};

export type ExpenseInput = {
  description: string;
  amountCents: number;
  paidById: string;
  groupId: string;
  split: SplitMode;
  shares: Share[];
};

export type PaymentInput = {
  fromId: string;
  toId: string;
  amountCents: number;
  groupId: string;
  note: string;
};
