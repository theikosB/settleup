"use client";

import { useState, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";
import { ActivityList, type ActivityItem } from "@/components/activity-list";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExpenseDialog } from "@/components/expense-dialog";
import { GroupDialog } from "@/components/group-dialog";
import { PaymentDialog, type PaymentPreset } from "@/components/payment-dialog";
import { PeopleDialog } from "@/components/people-dialog";
import { PersonMark } from "@/components/person-mark";
import { SettlementPanel, type SettlementTransfer } from "@/components/settlement-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLedger } from "@/lib/ledger-context";
import { formatMoney } from "@/lib/money";
import { settlementFor, spentCents, unsettledCents } from "@/lib/settle";
import type { Expense, Ledger, Payment, Transfer } from "@/lib/types";
import { cn } from "@/lib/utils";

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => void;
};

export function EvenApp() {
  const ledgerApi = useLedger();
  const { ledger, ready, persistenceError, loadSample, clearAll, addPayment, removePayment } = ledgerApi;
  const [selected, setSelected] = useState("all");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [groupEditing, setGroupEditing] = useState<string | null | undefined>(undefined);
  const [expenseEditing, setExpenseEditing] = useState<string | null | undefined>(undefined);
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [banner, setBanner] = useState<{ paymentId: string; text: string } | null>(null);
  const active = ledger.groups.some((group) => group.id === selected) ? selected : "all";

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="font-heading text-4xl text-primary italic">Even</p>
          <p className="mt-2 text-sm text-muted-foreground">Opening the ledger…</p>
        </div>
      </div>
    );
  }

  const fresh =
    ledger.people.length === 0 &&
    ledger.groups.length === 0 &&
    ledger.expenses.length === 0 &&
    ledger.payments.length === 0;

  const names = new Map(ledger.people.map((person) => [person.id, person.name]));
  const nameOf = (personId: string) => names.get(personId) ?? "Someone";
  const groupName = (groupId: string) =>
    ledger.groups.find((group) => group.id === groupId)?.name ?? "Group";

  const selectedGroup = ledger.groups.find((group) => group.id === active) ?? null;
  const scopeId = selectedGroup?.id ?? null;
  const settlement = settlementFor(ledger, scopeId);
  const openGroups = ledger.groups
    .map((group) => ({ group, settlement: settlementFor(ledger, group.id) }))
    .filter((item) => item.settlement.transfers.length > 0);
  const actionGroupId =
    scopeId ?? (openGroups.length === 1 ? openGroups[0]?.group.id ?? null : null);

  const visibleExpenses =
    scopeId === null
      ? ledger.expenses
      : ledger.expenses.filter((expense) => expense.groupId === scopeId);
  const visiblePayments =
    scopeId === null
      ? ledger.payments
      : ledger.payments.filter((payment) => payment.groupId === scopeId);
  const activity: ActivityItem[] = [
    ...visibleExpenses.map((expense) => ({
      kind: "expense" as const,
      id: expense.id,
      at: expense.createdAt,
      expense,
    })),
    ...visiblePayments.map((payment) => ({
      kind: "payment" as const,
      id: payment.id,
      at: payment.createdAt,
      payment,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));

  function requestSample() {
    const dirty = ledger.people.length > 0 || ledger.expenses.length > 0 || ledger.payments.length > 0;
    const apply = () => {
      loadSample();
      setSelected("all");
      setBanner(null);
    };
    if (!dirty) {
      apply();
      return;
    }
    setConfirm({
      title: "Replace this ledger?",
      description:
        "The Lisbon weekend sample replaces the people, groups, and expenses saved in this browser.",
      confirmLabel: "Load sample",
      destructive: true,
      run: apply,
    });
  }

  function requestClear() {
    setConfirm({
      title: "Clear the ledger?",
      description: "People, groups, expenses, and payments saved in this browser will be removed.",
      confirmLabel: "Clear everything",
      destructive: true,
      run: () => {
        clearAll();
        setSelected("all");
        setBanner(null);
      },
    });
  }

  function openExpense() {
    if (ledger.people.length < 2) {
      setPeopleOpen(true);
      return;
    }
    if (ledger.groups.length === 0) {
      setGroupEditing(null);
      return;
    }
    setExpenseEditing(null);
  }

  function markPaid(transfer: Transfer, groupId: string) {
    const result = addPayment({
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
      groupId,
      note: "Settlement",
    });
    if (!result.ok) return;
    const payment = result.ledger.payments[result.ledger.payments.length - 1];
    if (!payment) return;
    setBanner({
      paymentId: payment.id,
      text: `${nameOf(transfer.fromId)} paid ${nameOf(transfer.toId)} ${formatMoney(transfer.amountCents)}`,
    });
  }

  function adjustPayment(transfer: Transfer, groupId: string) {
    setPaymentPreset({
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
      groupId,
      note: "Settlement",
    });
  }

  function askDeleteExpense(expense: Expense) {
    setConfirm({
      title: `Remove ${expense.description}?`,
      description: "The settlement is recalculated without this expense.",
      confirmLabel: "Remove expense",
      destructive: true,
      run: () => ledgerApi.removeExpense(expense.id),
    });
  }

  function askDeletePayment(payment: Payment) {
    setConfirm({
      title: "Remove this payment?",
      description: `${nameOf(payment.fromId)}'s payment to ${nameOf(payment.toId)} will come back as a debt.`,
      confirmLabel: "Remove payment",
      destructive: true,
      run: () => ledgerApi.removePayment(payment.id),
    });
  }

  const latestExpense = [...ledger.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const defaultGroupId =
    scopeId ?? latestExpense?.groupId ?? ledger.groups[0]?.id ?? "";

  const showBreakdown = scopeId === null && openGroups.length > 1;
  const headline = scopeId === null ? "All activity" : (selectedGroup?.name ?? "Group");
  const memberLine =
    scopeId === null
      ? ledger.people.map((person) => person.name).join(", ")
      : (selectedGroup?.memberIds ?? []).map((id) => nameOf(id)).join(", ");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary font-heading text-xl text-primary-foreground italic">
            e
          </span>
          <div>
            <p className="font-heading text-2xl leading-none tracking-tight">Even</p>
            <p className="mt-1 text-xs text-muted-foreground">Shared costs, settled simply</p>
          </div>
        </div>
        {fresh ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setPeopleOpen(true)}>
              People
            </Button>
            <Button type="button" variant="outline" onClick={() => setGroupEditing(null)}>
              Group
            </Button>
            <Button type="button" className="hidden md:inline-flex" onClick={openExpense}>
              <PlusIcon />
              Add expense
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                More
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={requestSample}>Load sample weekend</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={requestClear}>
                  Clear ledger
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      {persistenceError ? (
        <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="status">
          {persistenceError}
        </p>
      ) : null}

      {banner ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <p>Recorded. {banner.text}.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                removePayment(banner.paymentId);
                setBanner(null);
              }}
            >
              Undo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setBanner(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {fresh ? (
        <Welcome onAddPeople={() => setPeopleOpen(true)} onSample={requestSample} />
      ) : (
        <div className="mt-6 grid flex-1 gap-6 pb-24 md:grid-cols-[17.5rem_minmax(0,1fr)] md:gap-8 md:pb-0">
          <aside className="hidden md:block">
            <nav aria-label="Groups" className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Groups
              </p>
              <GroupButton
                selected={active === "all"}
                name="All activity"
                detail={scopeDetail(ledger, null)}
                onClick={() => setSelected("all")}
              />
              {ledger.groups.map((group) => (
                <GroupButton
                  key={group.id}
                  selected={active === group.id}
                  name={group.name}
                  detail={scopeDetail(ledger, group.id)}
                  onClick={() => setSelected(group.id)}
                />
              ))}
            </nav>
            <div className="mt-6">
              <div className="mb-1 flex items-center justify-between px-3">
                <h2 className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  People
                </h2>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPeopleOpen(true)}>
                  Edit
                </Button>
              </div>
              <ul>
                {ledger.people.map((person) => (
                  <li key={person.id} className="flex items-center gap-2.5 px-3 py-1.5">
                    <PersonMark id={person.id} name={person.name} size="sm" />
                    <span className="truncate text-sm">{person.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
              <Chip selected={active === "all"} onClick={() => setSelected("all")}>
                All activity
              </Chip>
              {ledger.groups.map((group) => (
                <Chip
                  key={group.id}
                  selected={active === group.id}
                  onClick={() => setSelected(group.id)}
                >
                  {group.name}
                </Chip>
              ))}
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {scopeId === null ? "Entire ledger" : "Group"}
                </p>
                <h1 className="mt-1 font-heading text-4xl tracking-tight">{headline}</h1>
                {memberLine ? (
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">{memberLine}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No one is on the ledger yet.</p>
                )}
                <p className="mt-1 text-sm">
                  Spent {formatMoney(spentCents(visibleExpenses))}
                  {" · "}
                  {visibleExpenses.length} {visibleExpenses.length === 1 ? "expense" : "expenses"}
                </p>
              </div>
              {selectedGroup ? (
                <Button type="button" variant="outline" onClick={() => setGroupEditing(selectedGroup.id)}>
                  Edit group
                </Button>
              ) : null}
            </div>

            {ledger.groups.length === 0 ? (
              <section className="rounded-2xl bg-card px-5 py-6 ring-1 ring-foreground/10">
                <h2 className="font-heading text-3xl tracking-tight">Create a group</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Every expense asks which group it is shared with. A trip, a household, or a single dinner — and it needs at least two people.
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => setGroupEditing(null)}
                  disabled={ledger.people.length < 2}
                >
                  New group
                </Button>
                {ledger.people.length < 2 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <button type="button" className="underline underline-offset-4" onClick={() => setPeopleOpen(true)}>
                      Add another person
                    </button>{" "}
                    before creating the group.
                  </p>
                ) : null}
              </section>
            ) : (
              <div className="flex flex-col gap-4">
                <SettlementPanel
                  eyebrow={scopeId === null ? "Across every group" : "In this group"}
                  title="Who owes whom"
                  description={settlementCopy(scopeId, selectedGroup?.name ?? "this group", showBreakdown)}
                  rows={settlement.balances.map((balance) => ({
                    id: balance.personId,
                    name: nameOf(balance.personId),
                    balanceCents: balance.balanceCents,
                  }))}
                  transfers={toTransferRows(
                    settlement.transfers,
                    nameOf,
                    actionGroupId,
                    markPaid,
                    adjustPayment,
                  )}
                  emptyTitle="Everyone is even."
                  emptyBody={
                    visibleExpenses.length === 0
                      ? "Add an expense and this is where the payments will show up."
                      : scopeId === null
                        ? "Every recorded cost and payback cancels out."
                        : `Nothing is outstanding in ${selectedGroup?.name ?? "this group"}.`
                  }
                />
                {showBreakdown ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="px-1 font-heading text-2xl tracking-tight">Or settle one group at a time</h2>
                    <p className="px-1 text-sm text-muted-foreground">
                      These payments stay inside the group where the money was spent. Marking one paid does not move money between groups.
                    </p>
                    {openGroups.map((item) => (
                      <SettlementPanel
                        key={item.group.id}
                        tone="plain"
                        eyebrow="Group"
                        title={item.group.name}
                        description={`Payments that settle ${item.group.name} on its own.`}
                        rows={item.settlement.balances.map((balance) => ({
                          id: balance.personId,
                          name: nameOf(balance.personId),
                          balanceCents: balance.balanceCents,
                        }))}
                        transfers={toTransferRows(
                          item.settlement.transfers,
                          nameOf,
                          item.group.id,
                          markPaid,
                          adjustPayment,
                        )}
                        emptyTitle="Everyone is even."
                        emptyBody=""
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <ActivityList
              items={activity}
              nameOf={nameOf}
              groupName={groupName}
              showGroup={scopeId === null}
              onEditExpense={(expenseId) => setExpenseEditing(expenseId)}
              onDeleteExpense={askDeleteExpense}
              onDeletePayment={askDeletePayment}
              emptyTitle={selectedGroup ? `Nothing spent in ${selectedGroup.name} yet` : "The ledger is empty"}
              emptyBody="Add what someone paid, choose the group it belongs to, and split it equally or by exact amounts."
            />
          </main>
        </div>
      )}

      {fresh ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur md:hidden">
          <Button type="button" className="h-11 w-full" onClick={openExpense}>
            <PlusIcon />
            Add expense
          </Button>
        </div>
      )}

      <PeopleDialog open={peopleOpen} onOpenChange={setPeopleOpen} />
      <GroupDialog
        open={groupEditing !== undefined}
        groupId={groupEditing ?? null}
        onOpenChange={(open) => {
          if (!open) setGroupEditing(undefined);
        }}
        onCreated={(groupId) => {
          setSelected(groupId);
          setGroupEditing(undefined);
        }}
        onDeleted={(groupId) => {
          if (selected === groupId) setSelected("all");
          setGroupEditing(undefined);
        }}
      />
      <ExpenseDialog
        open={expenseEditing !== undefined}
        expenseId={expenseEditing ?? null}
        defaultGroupId={defaultGroupId}
        onOpenChange={(open) => {
          if (!open) setExpenseEditing(undefined);
        }}
      />
      <PaymentDialog
        open={paymentPreset !== null}
        preset={paymentPreset}
        onOpenChange={(open) => {
          if (!open) setPaymentPreset(null);
        }}
        onRecorded={(paymentId, summary) => {
          setBanner({ paymentId, text: summary });
        }}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        destructive={confirm?.destructive}
        onConfirm={() => confirm?.run()}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
    </div>
  );
}

function Welcome({ onAddPeople, onSample }: { onAddPeople: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl pb-10 sm:mt-16">
      <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Expense splitter
      </p>
      <h1 className="mt-3 max-w-xl font-heading text-5xl leading-[1.02] tracking-tight sm:text-6xl">
        Who paid, who shares it, who settles.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Even records what each person spends, asks which group the cost belongs to, and splits it equally or in exact amounts. When the spending stops, it works out the fewest payments that make everyone even.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="h-11" onClick={onAddPeople}>
          Add people
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={onSample}>
          Load the Lisbon weekend
        </Button>
      </div>
      <ol className="mt-12 grid gap-4 sm:grid-cols-3">
        <WelcomeStep
          step="1"
          title="People"
          body="Everyone who pays for something, or owes a share of it."
        />
        <WelcomeStep
          step="2"
          title="A group"
          body="The trip, household, or dinner the cost is shared with."
        />
        <WelcomeStep
          step="3"
          title="The split"
          body="Equally, or the exact amount each person owes. Then see who pays whom."
        />
      </ol>
      <p className="mt-8 text-sm text-muted-foreground">
        Balances stay in this browser. Nothing is uploaded.
      </p>
    </div>
  );
}

function WelcomeStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <li className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <p className="font-heading text-sm text-primary">{step}</p>
      <p className="mt-2 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}

function GroupButton({
  selected,
  name,
  detail,
  onClick,
}: {
  selected: boolean;
  name: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span
          className={cn(
            "block truncate text-xs",
            selected ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm",
        selected ? "border-primary bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      {children}
    </button>
  );
}

function scopeDetail(ledger: Ledger, groupId: string | null): string {
  if (groupId) {
    const group = ledger.groups.find((item) => item.id === groupId);
    const count = group?.memberIds.length ?? 0;
    const people = `${count} ${count === 1 ? "person" : "people"}`;
    const hasExpenses = ledger.expenses.some((expense) => expense.groupId === groupId);
    const open = unsettledCents(ledger, groupId);
    if (!hasExpenses) return `${people} · no expenses`;
    if (open === 0) return `${people} · settled`;
    return `${people} · ${formatMoney(open)} open`;
  }
  const open = unsettledCents(ledger, null);
  const separate = ledger.groups.reduce((sum, group) => sum + unsettledCents(ledger, group.id), 0);
  if (ledger.expenses.length === 0) return "No expenses yet";
  if (open === 0) return "Everyone is even";
  if (open !== separate) return `${formatMoney(open)} open, net`;
  return `${formatMoney(open)} open`;
}

function settlementCopy(groupId: string | null, groupName: string, showBreakdown: boolean): string {
  if (groupId) return `The fewest payments that settle ${groupName}.`;
  if (showBreakdown) {
    return "Debts are netted across groups. Someone owed for a trip and owing at home can come out as one smaller payment.";
  }
  return "The fewest payments that settle everything currently on the ledger.";
}

function toTransferRows(
  transfers: Transfer[],
  nameOf: (personId: string) => string,
  groupId: string | null,
  onMarkPaid: (transfer: Transfer, groupId: string) => void,
  onAdjust: (transfer: Transfer, groupId: string) => void,
): SettlementTransfer[] {
  return transfers.map((transfer) => ({
    key: `${groupId ?? "net"}-${transfer.fromId}-${transfer.toId}-${transfer.amountCents}`,
    from: { id: transfer.fromId, name: nameOf(transfer.fromId) },
    to: { id: transfer.toId, name: nameOf(transfer.toId) },
    amountCents: transfer.amountCents,
    onMarkPaid: groupId ? () => onMarkPaid(transfer, groupId) : undefined,
    onAdjust: groupId ? () => onAdjust(transfer, groupId) : undefined,
  }));
}
