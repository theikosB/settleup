import { emptyLedger } from "@/lib/ledger";
import type { Expense, Group, Ledger, Payment, Person, Share } from "@/lib/types";

export const LEDGER_STORAGE_KEY = "even.ledger.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPerson(value: unknown): value is Person {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isGroup(value: unknown): value is Group {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.memberIds) &&
    value.memberIds.every((id) => typeof id === "string")
  );
}

function isShare(value: unknown): value is Share {
  return (
    isRecord(value) &&
    typeof value.personId === "string" &&
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents)
  );
}

function isExpense(value: unknown): value is Expense {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    typeof value.paidById === "string" &&
    typeof value.groupId === "string" &&
    (value.split === "equal" || value.split === "amounts") &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.shares) &&
    value.shares.every(isShare)
  );
}

function isPayment(value: unknown): value is Payment {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.fromId === "string" &&
    typeof value.toId === "string" &&
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    typeof value.groupId === "string" &&
    typeof value.note === "string" &&
    typeof value.createdAt === "string"
  );
}

export function parseLedger(value: unknown): Ledger | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!Array.isArray(value.people) || !value.people.every(isPerson)) return null;
  if (!Array.isArray(value.groups) || !value.groups.every(isGroup)) return null;
  if (!Array.isArray(value.expenses) || !value.expenses.every(isExpense)) return null;
  if (!Array.isArray(value.payments) || !value.payments.every(isPayment)) return null;
  return {
    version: 1,
    people: value.people,
    groups: value.groups,
    expenses: value.expenses,
    payments: value.payments,
  };
}

type KeyValueStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function loadLedger(storage: KeyValueStore | null): Ledger {
  if (!storage) return emptyLedger();
  try {
    const raw = storage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return emptyLedger();
    return parseLedger(JSON.parse(raw)) ?? emptyLedger();
  } catch {
    return emptyLedger();
  }
}

export function saveLedger(storage: KeyValueStore, ledger: Ledger): void {
  storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
}
