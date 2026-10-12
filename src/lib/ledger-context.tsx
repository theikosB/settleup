"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  addExpense as addExpenseToLedger,
  addGroup as addGroupToLedger,
  addPayment as addPaymentToLedger,
  addPerson as addPersonToLedger,
  emptyLedger,
  removeExpense as removeExpenseFromLedger,
  removeGroup as removeGroupFromLedger,
  removePayment as removePaymentFromLedger,
  removePerson as removePersonFromLedger,
  renamePerson as renamePersonInLedger,
  updateExpense as updateExpenseInLedger,
  updateGroup as updateGroupInLedger,
  type Mutation,
} from "@/lib/ledger";
import { sampleLedger } from "@/lib/sample";
import { loadLedger, saveLedger } from "@/lib/storage";
import type { ExpenseInput, Ledger, PaymentInput } from "@/lib/types";

type StoreState = {
  ledger: Ledger;
  ready: boolean;
  persistenceError: string | null;
};

const serverState: StoreState = {
  ledger: emptyLedger(),
  ready: false,
  persistenceError: null,
};

let state: StoreState = serverState;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readSavedLedger(): StoreState {
  try {
    return {
      ledger: loadLedger(window.localStorage),
      ready: true,
      persistenceError: null,
    };
  } catch {
    return {
      ledger: emptyLedger(),
      ready: true,
      persistenceError: "Saved balances could not be read. Starting from an empty ledger.",
    };
  }
}

function getState(): StoreState {
  if (!state.ready && typeof window !== "undefined") {
    state = readSavedLedger();
  }
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(ledger: Ledger) {
  let persistenceError: string | null = null;
  try {
    saveLedger(window.localStorage, ledger);
  } catch {
    persistenceError = "This browser is not saving changes. They last until you close the tab.";
  }
  state = { ledger, ready: true, persistenceError };
  emit();
}

function apply(result: Mutation): Mutation {
  if (result.ok) commit(result.ledger);
  return result;
}

type LedgerApi = {
  ledger: Ledger;
  ready: boolean;
  persistenceError: string | null;
  addPerson: (name: string) => Mutation;
  renamePerson: (personId: string, name: string) => Mutation;
  removePerson: (personId: string) => Mutation;
  addGroup: (input: { name: string; memberIds: string[] }) => Mutation;
  updateGroup: (groupId: string, input: { name: string; memberIds: string[] }) => Mutation;
  removeGroup: (groupId: string) => Mutation;
  addExpense: (input: ExpenseInput) => Mutation;
  updateExpense: (expenseId: string, input: ExpenseInput) => Mutation;
  removeExpense: (expenseId: string) => Mutation;
  addPayment: (input: PaymentInput) => Mutation;
  removePayment: (paymentId: string) => Mutation;
  loadSample: () => void;
  clearAll: () => void;
};

export function useLedger(): LedgerApi {
  const snapshot = useSyncExternalStore(subscribe, getState, () => serverState);

  return useMemo<LedgerApi>(() => {
    const { ledger, ready, persistenceError } = snapshot;
    return {
      ledger,
      ready,
      persistenceError,
      addPerson: (name) => apply(addPersonToLedger(ledger, name)),
      renamePerson: (personId, name) => apply(renamePersonInLedger(ledger, personId, name)),
      removePerson: (personId) => apply(removePersonFromLedger(ledger, personId)),
      addGroup: (input) => apply(addGroupToLedger(ledger, input)),
      updateGroup: (groupId, input) => apply(updateGroupInLedger(ledger, groupId, input)),
      removeGroup: (groupId) => apply(removeGroupFromLedger(ledger, groupId)),
      addExpense: (input) => apply(addExpenseToLedger(ledger, input)),
      updateExpense: (expenseId, input) => apply(updateExpenseInLedger(ledger, expenseId, input)),
      removeExpense: (expenseId) => apply(removeExpenseFromLedger(ledger, expenseId)),
      addPayment: (input) => apply(addPaymentToLedger(ledger, input)),
      removePayment: (paymentId) => apply(removePaymentFromLedger(ledger, paymentId)),
      loadSample: () => commit(sampleLedger()),
      clearAll: () => commit(emptyLedger()),
    };
  }, [snapshot]);
}
