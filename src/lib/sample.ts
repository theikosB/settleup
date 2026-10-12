import type { Ledger } from "@/lib/types";

export const sampleIds = {
  maya: "maya",
  jonah: "jonah",
  priya: "priya",
  sam: "sam",
  lena: "lena",
  lisbon: "lisbon",
  apartment: "apartment",
} as const;

function at(day: number, hour: number): string {
  return `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

export function sampleLedger(): Ledger {
  const { maya, jonah, priya, sam, lena, lisbon, apartment } = sampleIds;
  return {
    version: 1,
    people: [
      { id: maya, name: "Maya Chen" },
      { id: jonah, name: "Jonah Adler" },
      { id: priya, name: "Priya Shah" },
      { id: sam, name: "Sam Okonkwo" },
      { id: lena, name: "Lena Brooks" },
    ],
    groups: [
      {
        id: lisbon,
        name: "Lisbon weekend",
        memberIds: [maya, jonah, priya, sam],
      },
      {
        id: apartment,
        name: "Apartment",
        memberIds: [maya, lena],
      },
    ],
    expenses: [
      {
        id: "airbnb",
        description: "Alfama apartment, three nights",
        amountCents: 48000,
        paidById: maya,
        groupId: lisbon,
        split: "equal",
        shares: [maya, jonah, priya, sam].map((personId) => ({
          personId,
          amountCents: 12000,
        })),
        createdAt: at(9, 15),
      },
      {
        id: "dinner",
        description: "Dinner at Cervejaria",
        amountCents: 8640,
        paidById: jonah,
        groupId: lisbon,
        split: "equal",
        shares: [maya, jonah, priya, sam].map((personId) => ({
          personId,
          amountCents: 2160,
        })),
        createdAt: at(10, 21),
      },
      {
        id: "groceries",
        description: "Mercado breakfast and snacks",
        amountCents: 3750,
        paidById: priya,
        groupId: lisbon,
        split: "amounts",
        shares: [
          { personId: maya, amountCents: 800 },
          { personId: jonah, amountCents: 800 },
          { personId: priya, amountCents: 1250 },
          { personId: sam, amountCents: 900 },
        ],
        createdAt: at(10, 11),
      },
      {
        id: "metro",
        description: "Metro cards",
        amountCents: 2400,
        paidById: sam,
        groupId: lisbon,
        split: "equal",
        shares: [maya, jonah, priya, sam].map((personId) => ({
          personId,
          amountCents: 600,
        })),
        createdAt: at(10, 9),
      },
      {
        id: "utilities",
        description: "October utilities",
        amountCents: 9000,
        paidById: lena,
        groupId: apartment,
        split: "equal",
        shares: [maya, lena].map((personId) => ({
          personId,
          amountCents: 4500,
        })),
        createdAt: at(11, 12),
      },
      {
        id: "cleaning",
        description: "Cleaning supplies",
        amountCents: 3000,
        paidById: maya,
        groupId: apartment,
        split: "equal",
        shares: [maya, lena].map((personId) => ({
          personId,
          amountCents: 1500,
        })),
        createdAt: at(11, 18),
      },
    ],
    payments: [],
  };
}
