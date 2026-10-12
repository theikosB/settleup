import { cleanName, MAX_CENTS, shareSum } from "@/lib/money";
import type {
  ExpenseInput,
  Group,
  Ledger,
  PaymentInput,
  Person,
} from "@/lib/types";

export type Mutation =
  | { ok: true; ledger: Ledger }
  | { ok: false; error: string };

function createId(): string {
  return crypto.randomUUID();
}

export function emptyLedger(): Ledger {
  return { version: 1, people: [], groups: [], expenses: [], payments: [] };
}

function fail(error: string): Mutation {
  return { ok: false, error };
}

function ok(ledger: Ledger): Mutation {
  return { ok: true, ledger };
}

function personExists(ledger: Ledger, personId: string): boolean {
  return ledger.people.some((person) => person.id === personId);
}

function groupById(ledger: Ledger, groupId: string): Group | undefined {
  return ledger.groups.find((group) => group.id === groupId);
}

export function validateExpenseInput(
  ledger: Ledger,
  input: ExpenseInput,
): string | null {
  const description = cleanName(input.description);
  if (!description) return "Add a short description.";
  if (description.length > 80) return "Keep the description under 80 characters.";
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (input.amountCents > MAX_CENTS) return "That amount is larger than this ledger allows.";
  if (!groupById(ledger, input.groupId)) return "Choose the group this cost is shared with.";
  if (!personExists(ledger, input.paidById)) return "Choose who paid.";
  if (input.split !== "equal" && input.split !== "amounts") {
    return "Choose an equal split or exact amounts.";
  }
  if (input.shares.length === 0) return "Choose at least one person to split this with.";
  const seen = new Set<string>();
  for (const share of input.shares) {
    if (seen.has(share.personId)) return "A person can only appear once in a split.";
    seen.add(share.personId);
    if (!personExists(ledger, share.personId)) return "Every share needs a person on the ledger.";
    if (!Number.isInteger(share.amountCents) || share.amountCents < 0) {
      return "Each share needs an amount of zero or more.";
    }
  }
  if (shareSum(input.shares) !== input.amountCents) {
    return "The shares have to add up to the total.";
  }
  return null;
}

export function validatePaymentInput(
  ledger: Ledger,
  input: PaymentInput,
): string | null {
  if (!groupById(ledger, input.groupId)) return "Choose which group this payment settles.";
  if (!personExists(ledger, input.fromId) || !personExists(ledger, input.toId)) {
    return "Choose both people.";
  }
  if (input.fromId === input.toId) return "A payment has to be between two different people.";
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (input.amountCents > MAX_CENTS) return "That amount is larger than this ledger allows.";
  if (cleanName(input.note).length > 80) return "Keep the note under 80 characters.";
  return null;
}

export function addPerson(
  ledger: Ledger,
  name: string,
  id: string = createId(),
): Mutation {
  const cleaned = cleanName(name);
  if (!cleaned) return fail("Enter a name.");
  if (cleaned.length > 40) return fail("Keep the name under 40 characters.");
  const person: Person = { id, name: cleaned };
  return ok({ ...ledger, people: [...ledger.people, person] });
}

export function renamePerson(
  ledger: Ledger,
  personId: string,
  name: string,
): Mutation {
  const cleaned = cleanName(name);
  if (!cleaned) return fail("Enter a name.");
  if (cleaned.length > 40) return fail("Keep the name under 40 characters.");
  if (!personExists(ledger, personId)) return fail("That person is no longer on the ledger.");
  return ok({
    ...ledger,
    people: ledger.people.map((person) =>
      person.id === personId ? { ...person, name: cleaned } : person,
    ),
  });
}

function personHasHistory(ledger: Ledger, personId: string): boolean {
  return (
    ledger.expenses.some(
      (expense) =>
        expense.paidById === personId ||
        expense.shares.some((share) => share.personId === personId),
    ) ||
    ledger.payments.some(
      (payment) => payment.fromId === personId || payment.toId === personId,
    )
  );
}

export function removePerson(ledger: Ledger, personId: string): Mutation {
  if (!personExists(ledger, personId)) return fail("That person is no longer on the ledger.");
  if (personHasHistory(ledger, personId)) {
    return fail("This person is part of an expense or payment. Remove those first.");
  }
  return ok({
    ...ledger,
    people: ledger.people.filter((person) => person.id !== personId),
    groups: ledger.groups.map((group) => ({
      ...group,
      memberIds: group.memberIds.filter((id) => id !== personId),
    })),
  });
}

function normalizeMembers(ledger: Ledger, memberIds: string[]): string | string[] {
  const unique: string[] = [];
  for (const memberId of memberIds) {
    if (!personExists(ledger, memberId)) return "Every member needs to be a person on the ledger.";
    if (!unique.includes(memberId)) unique.push(memberId);
  }
  if (unique.length < 2) return "A group needs at least two people.";
  return unique;
}

export function addGroup(
  ledger: Ledger,
  input: { name: string; memberIds: string[] },
  id: string = createId(),
): Mutation {
  const name = cleanName(input.name);
  if (!name) return fail("Name the group.");
  if (name.length > 48) return fail("Keep the group name under 48 characters.");
  const members = normalizeMembers(ledger, input.memberIds);
  if (typeof members === "string") return fail(members);
  return ok({
    ...ledger,
    groups: [...ledger.groups, { id, name, memberIds: members }],
  });
}

export function updateGroup(
  ledger: Ledger,
  groupId: string,
  input: { name: string; memberIds: string[] },
): Mutation {
  if (!groupById(ledger, groupId)) return fail("That group is no longer on the ledger.");
  const name = cleanName(input.name);
  if (!name) return fail("Name the group.");
  if (name.length > 48) return fail("Keep the group name under 48 characters.");
  const members = normalizeMembers(ledger, input.memberIds);
  if (typeof members === "string") return fail(members);
  return ok({
    ...ledger,
    groups: ledger.groups.map((group) =>
      group.id === groupId ? { ...group, name, memberIds: members } : group,
    ),
  });
}

export function removeGroup(ledger: Ledger, groupId: string): Mutation {
  if (!groupById(ledger, groupId)) return fail("That group is no longer on the ledger.");
  if (ledger.expenses.some((expense) => expense.groupId === groupId)) {
    return fail("This group still has expenses. Remove those first.");
  }
  if (ledger.payments.some((payment) => payment.groupId === groupId)) {
    return fail("This group still has payments. Remove those first.");
  }
  return ok({
    ...ledger,
    groups: ledger.groups.filter((group) => group.id !== groupId),
  });
}

export function addExpense(
  ledger: Ledger,
  input: ExpenseInput,
  id: string = createId(),
  createdAt: string = new Date().toISOString(),
): Mutation {
  const error = validateExpenseInput(ledger, input);
  if (error) return fail(error);
  return ok({
    ...ledger,
    expenses: [
      ...ledger.expenses,
      {
        id,
        description: cleanName(input.description),
        amountCents: input.amountCents,
        paidById: input.paidById,
        groupId: input.groupId,
        split: input.split,
        shares: input.shares.map((share) => ({ ...share })),
        createdAt,
      },
    ],
  });
}

export function updateExpense(
  ledger: Ledger,
  expenseId: string,
  input: ExpenseInput,
): Mutation {
  const existing = ledger.expenses.find((expense) => expense.id === expenseId);
  if (!existing) return fail("That expense is no longer on the ledger.");
  const error = validateExpenseInput(ledger, input);
  if (error) return fail(error);
  return ok({
    ...ledger,
    expenses: ledger.expenses.map((expense) =>
      expense.id === expenseId
        ? {
            ...expense,
            description: cleanName(input.description),
            amountCents: input.amountCents,
            paidById: input.paidById,
            groupId: input.groupId,
            split: input.split,
            shares: input.shares.map((share) => ({ ...share })),
          }
        : expense,
    ),
  });
}

export function removeExpense(ledger: Ledger, expenseId: string): Mutation {
  if (!ledger.expenses.some((expense) => expense.id === expenseId)) {
    return fail("That expense is no longer on the ledger.");
  }
  return ok({
    ...ledger,
    expenses: ledger.expenses.filter((expense) => expense.id !== expenseId),
  });
}

export function addPayment(
  ledger: Ledger,
  input: PaymentInput,
  id: string = createId(),
  createdAt: string = new Date().toISOString(),
): Mutation {
  const error = validatePaymentInput(ledger, input);
  if (error) return fail(error);
  return ok({
    ...ledger,
    payments: [
      ...ledger.payments,
      {
        id,
        fromId: input.fromId,
        toId: input.toId,
        amountCents: input.amountCents,
        groupId: input.groupId,
        note: cleanName(input.note),
        createdAt,
      },
    ],
  });
}

export function removePayment(ledger: Ledger, paymentId: string): Mutation {
  if (!ledger.payments.some((payment) => payment.id === paymentId)) {
    return fail("That payment is no longer on the ledger.");
  }
  return ok({
    ...ledger,
    payments: ledger.payments.filter((payment) => payment.id !== paymentId),
  });
}
