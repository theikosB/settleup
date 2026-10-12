import { formatMoney } from "@/lib/money";
import type { Expense, Share } from "@/lib/types";

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${last}`.toUpperCase();
}

const hues = ["#1f6b56", "#9a4a24", "#2c4c7c", "#6d5420", "#6b3050", "#215e66"];

export function personHue(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hues[hash % hues.length] ?? hues[0];
}

export function describeSplit(
  expense: Pick<Expense, "split" | "shares">,
  nameOf: (personId: string) => string,
): string {
  const positive = expense.shares.filter((share) => share.amountCents > 0);
  if (positive.length === 0) return "No one was given a share";
  const distinct = new Set(positive.map((share) => share.amountCents));
  if (expense.split === "equal" && distinct.size === 1) {
    const each = positive[0]?.amountCents ?? 0;
    return `Split equally · ${formatMoney(each)} each`;
  }
  const listed = positive
    .map((share: Share) => `${firstName(nameOf(share.personId))} ${formatMoney(share.amountCents)}`)
    .join(" · ");
  return expense.split === "equal" ? `Split equally · ${listed}` : `Exact amounts · ${listed}`;
}
