import { describe, expect, it } from "vitest";
import {
  addExpense,
  addGroup,
  addPerson,
  emptyLedger,
  removeGroup,
  removePerson,
  updateExpense,
} from "@/lib/ledger";
import { equalShares } from "@/lib/money";
import { sampleIds, sampleLedger } from "@/lib/sample";
import { loadLedger, parseLedger, saveLedger } from "@/lib/storage";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("ledger mutations", () => {
  it("builds a group only after two people exist", () => {
    let ledger = emptyLedger();
    const maya = addPerson(ledger, "Maya Chen", "maya");
    expect(maya.ok).toBe(true);
    if (!maya.ok) return;
    ledger = maya.ledger;
    const tooSmall = addGroup(ledger, { name: "Trip", memberIds: ["maya"] }, "trip");
    expect(tooSmall).toEqual({ ok: false, error: "A group needs at least two people." });
    const jonah = addPerson(ledger, "  Jonah   Adler ", "jonah");
    expect(jonah.ok).toBe(true);
    if (!jonah.ok) return;
    ledger = jonah.ledger;
    expect(ledger.people[1]?.name).toBe("Jonah Adler");
    const group = addGroup(ledger, { name: "Trip", memberIds: ["maya", "jonah"] }, "trip");
    expect(group.ok).toBe(true);
  });

  it("stores an equal split that sums to the total", () => {
    let ledger = emptyLedger();
    for (const [id, name] of [
      ["maya", "Maya Chen"],
      ["jonah", "Jonah Adler"],
      ["priya", "Priya Shah"],
    ] as const) {
      const added = addPerson(ledger, name, id);
      if (!added.ok) throw new Error(added.error);
      ledger = added.ledger;
    }
    const group = addGroup(
      ledger,
      { name: "Dinner", memberIds: ["maya", "jonah", "priya"] },
      "dinner",
    );
    if (!group.ok) throw new Error(group.error);
    ledger = group.ledger;
    const shares = equalShares(1000, ["maya", "jonah", "priya"]);
    const expense = addExpense(
      ledger,
      {
        description: "Pizza",
        amountCents: 1000,
        paidById: "maya",
        groupId: "dinner",
        split: "equal",
        shares,
      },
      "pizza",
      "2026-10-12T12:00:00.000Z",
    );
    expect(expense.ok).toBe(true);
    if (!expense.ok) return;
    expect(expense.ledger.expenses[0]?.shares.map((share) => share.amountCents)).toEqual([
      334, 333, 333,
    ]);
    const edited = updateExpense(expense.ledger, "pizza", {
      description: "Pizza and salad",
      amountCents: 900,
      paidById: "jonah",
      groupId: "dinner",
      split: "amounts",
      shares: [
        { personId: "maya", amountCents: 300 },
        { personId: "jonah", amountCents: 300 },
        { personId: "priya", amountCents: 300 },
      ],
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.ledger.expenses[0]?.description).toBe("Pizza and salad");
    expect(edited.ledger.expenses[0]?.createdAt).toBe("2026-10-12T12:00:00.000Z");
  });

  it("refuses to erase someone who is already in the books", () => {
    const removed = removePerson(sampleLedger(), sampleIds.maya);
    expect(removed.ok).toBe(false);
    const group = removeGroup(sampleLedger(), sampleIds.lisbon);
    expect(group.ok).toBe(false);
  });

  it("rejects a custom split that does not add up", () => {
    const result = addExpense(sampleLedger(), {
      description: "Snacks",
      amountCents: 1000,
      paidById: sampleIds.maya,
      groupId: sampleIds.lisbon,
      split: "amounts",
      shares: [
        { personId: sampleIds.maya, amountCents: 400 },
        { personId: sampleIds.jonah, amountCents: 400 },
      ],
    });
    expect(result).toEqual({ ok: false, error: "The shares have to add up to the total." });
  });
});

describe("storage", () => {
  it("round-trips a ledger and ignores corrupt data", () => {
    const store = memoryStore();
    expect(loadLedger(store).people).toEqual([]);
    saveLedger(store, sampleLedger());
    expect(loadLedger(store).groups).toHaveLength(2);
    store.setItem("even.ledger.v1", "{not json");
    expect(loadLedger(store)).toEqual(emptyLedger());
    expect(parseLedger({ version: 2 })).toBeNull();
    expect(parseLedger(sampleLedger())?.expenses).toHaveLength(6);
  });
});
