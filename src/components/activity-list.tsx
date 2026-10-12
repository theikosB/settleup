"use client";

import type { ReactNode } from "react";
import { EllipsisIcon } from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describeSplit, formatWhen } from "@/lib/display";
import { formatMoney } from "@/lib/money";
import type { Expense, Payment } from "@/lib/types";

export type ActivityItem =
  | { kind: "expense"; id: string; at: string; expense: Expense }
  | { kind: "payment"; id: string; at: string; payment: Payment };

export function ActivityList({
  items,
  nameOf,
  groupName,
  showGroup,
  onEditExpense,
  onDeleteExpense,
  onDeletePayment,
  emptyTitle,
  emptyBody,
}: {
  items: ActivityItem[];
  nameOf: (personId: string) => string;
  groupName: (groupId: string) => string;
  showGroup: boolean;
  onEditExpense: (expenseId: string) => void;
  onDeleteExpense: (expense: Expense) => void;
  onDeletePayment: (payment: Payment) => void;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-2xl tracking-tight">Ledger</h2>
        <p className="text-sm text-muted-foreground">
          {items.length === 0 ? "Nothing yet" : `${items.length} ${items.length === 1 ? "entry" : "entries"}`}
        </p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-5 py-8">
          <p className="font-heading text-2xl tracking-tight">{emptyTitle}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{emptyBody}</p>
        </div>
      ) : (
        <ol className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {items.map((item) => (
            <li key={item.id} className="border-b px-4 py-3 last:border-b-0 sm:px-5">
              {item.kind === "expense" ? (
                <ExpenseRow
                  expense={item.expense}
                  nameOf={nameOf}
                  groupName={groupName}
                  showGroup={showGroup}
                  onEdit={() => onEditExpense(item.expense.id)}
                  onDelete={() => onDeleteExpense(item.expense)}
                />
              ) : (
                <PaymentRow
                  payment={item.payment}
                  nameOf={nameOf}
                  groupName={groupName}
                  showGroup={showGroup}
                  onDelete={() => onDeletePayment(item.payment)}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ExpenseRow({
  expense,
  nameOf,
  groupName,
  showGroup,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  nameOf: (personId: string) => string;
  groupName: (groupId: string) => string;
  showGroup: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <time className="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground" dateTime={expense.createdAt}>
        {formatWhen(expense.createdAt)}
      </time>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{expense.description}</p>
          <p className="shrink-0 font-heading text-xl tabular-nums tracking-tight">
            {formatMoney(expense.amountCents)}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {nameOf(expense.paidById)} paid
          {showGroup ? ` · ${groupName(expense.groupId)}` : ""}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{describeSplit(expense, nameOf)}</p>
      </div>
      <RowMenu label={`Actions for ${expense.description}`}>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </RowMenu>
    </div>
  );
}

function PaymentRow({
  payment,
  nameOf,
  groupName,
  showGroup,
  onDelete,
}: {
  payment: Payment;
  nameOf: (personId: string) => string;
  groupName: (groupId: string) => string;
  showGroup: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <time className="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground" dateTime={payment.createdAt}>
        {formatWhen(payment.createdAt)}
      </time>
      <PersonMark id={payment.fromId} name={nameOf(payment.fromId)} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">
            {nameOf(payment.fromId)} paid {nameOf(payment.toId)}
          </p>
          <p className="shrink-0 font-heading text-xl tabular-nums tracking-tight text-owed">
            {formatMoney(payment.amountCents)}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {payment.note || "Payment"}
          {showGroup ? ` · ${groupName(payment.groupId)}` : ""}
        </p>
      </div>
      <RowMenu label={`Actions for payment from ${nameOf(payment.fromId)}`}>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </RowMenu>
    </div>
  );
}

function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
