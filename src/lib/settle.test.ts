import { describe, expect, it } from "vitest";
import { sampleIds, sampleLedger } from "@/lib/sample";
import { addPayment } from "@/lib/ledger";
import { netBalances, settleBalances, settlementFor, unsettledCents } from "@/lib/settle";

describe("settlement", () => {
  it("nets the Lisbon weekend into three payments to Maya", () => {
    const ledger = sampleLedger();
    const { balances, transfers } = settlementFor(ledger, sampleIds.lisbon);
    expect(balances).toEqual([
      { personId: sampleIds.maya, balanceCents: 32440 },
      { personId: sampleIds.jonah, balanceCents: -6920 },
      { personId: sampleIds.priya, balanceCents: -12260 },
      { personId: sampleIds.sam, balanceCents: -13260 },
    ]);
    expect(transfers).toEqual([
      { fromId: sampleIds.sam, toId: sampleIds.maya, amountCents: 13260 },
      { fromId: sampleIds.priya, toId: sampleIds.maya, amountCents: 12260 },
      { fromId: sampleIds.jonah, toId: sampleIds.maya, amountCents: 6920 },
    ]);
    expect(unsettledCents(ledger, sampleIds.lisbon)).toBe(32440);
  });

  it("keeps the apartment separate from the trip", () => {
    const { transfers } = settlementFor(sampleLedger(), sampleIds.apartment);
    expect(transfers).toEqual([
      { fromId: sampleIds.maya, toId: sampleIds.lena, amountCents: 3000 },
    ]);
  });

  it("nets debts across groups into the fewest overall payments", () => {
    const { transfers } = settlementFor(sampleLedger(), null);
    expect(transfers).toEqual([
      { fromId: sampleIds.sam, toId: sampleIds.maya, amountCents: 13260 },
      { fromId: sampleIds.priya, toId: sampleIds.maya, amountCents: 12260 },
      { fromId: sampleIds.jonah, toId: sampleIds.maya, amountCents: 3920 },
      { fromId: sampleIds.jonah, toId: sampleIds.lena, amountCents: 3000 },
    ]);
    const totals = netBalances(sampleLedger().expenses, []);
    expect([...totals.values()].reduce((sum, cents) => sum + cents, 0)).toBe(0);
  });

  it("clears a group once the suggested payments are recorded", () => {
    let ledger = sampleLedger();
    for (const transfer of settlementFor(ledger, sampleIds.lisbon).transfers) {
      const result = addPayment(ledger, {
        ...transfer,
        groupId: sampleIds.lisbon,
        note: "Settlement",
      });
      expect(result.ok).toBe(true);
      if (result.ok) ledger = result.ledger;
    }
    expect(settlementFor(ledger, sampleIds.lisbon).transfers).toEqual([]);
    expect(settlementFor(ledger, sampleIds.apartment).transfers).toEqual([
      { fromId: sampleIds.maya, toId: sampleIds.lena, amountCents: 3000 },
    ]);
  });

  it("uses at most one fewer transfer than the number of people with a balance", () => {
    const balances = new Map<string, number>([
      ["a", 500],
      ["b", 300],
      ["c", -200],
      ["d", -400],
      ["e", -200],
    ]);
    const transfers = settleBalances(balances);
    expect(transfers.length).toBeLessThanOrEqual(4);
    expect(transfers.reduce((sum, transfer) => sum + transfer.amountCents, 0)).toBe(800);
  });
});
