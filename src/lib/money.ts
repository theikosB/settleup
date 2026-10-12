import type { Share } from "@/lib/types";

export const MAX_CENTS = 100_000_000;

export function parseDollars(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(trimmed);
  if (!match) return null;
  const dollars = Number(match[1]);
  const centsPart = (match[2] ?? "").padEnd(2, "0");
  const cents = dollars * 100 + Number(centsPart);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatMoney(cents: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(cents) / 100);
  return cents < 0 ? `−${formatted}` : formatted;
}

export function formatBalance(cents: number): string {
  if (cents > 0) return `+${formatMoney(cents)}`;
  return formatMoney(cents);
}

export function equalShares(totalCents: number, personIds: string[]): Share[] {
  if (personIds.length === 0) {
    throw new Error("Choose at least one person.");
  }
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const unique = new Set(personIds);
  if (unique.size !== personIds.length) {
    throw new Error("A person can only appear once in a split.");
  }
  const base = Math.floor(totalCents / personIds.length);
  let remainder = totalCents % personIds.length;
  return personIds.map((personId) => {
    const amountCents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { personId, amountCents };
  });
}

export function shareSum(shares: Share[]): number {
  return shares.reduce((sum, share) => sum + share.amountCents, 0);
}

export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
