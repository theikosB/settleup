"use client";

import { useMemo, useState } from "react";
import { MoneyField } from "@/components/money-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateExpenseInput } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { centsToInput, equalShares, formatMoney, parseDollars, shareSum } from "@/lib/money";
import type { ExpenseInput, SplitMode } from "@/lib/types";

export function ExpenseDialog({
  open,
  expenseId,
  defaultGroupId,
  onOpenChange,
}: {
  open: boolean;
  expenseId: string | null;
  defaultGroupId: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {open ? (
          <ExpenseForm
            key={expenseId ?? `new-${defaultGroupId}`}
            expenseId={expenseId}
            defaultGroupId={defaultGroupId}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  expenseId,
  defaultGroupId,
  onClose,
}: {
  expenseId: string | null;
  defaultGroupId: string;
  onClose: () => void;
}) {
  const { ledger, addExpense, updateExpense } = useLedger();
  const existing = ledger.expenses.find((expense) => expense.id === expenseId) ?? null;
  const startingGroup =
    ledger.groups.find((group) => group.id === (existing?.groupId ?? defaultGroupId))?.id ??
    ledger.groups[0]?.id ??
    "";

  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : "");
  const [groupId, setGroupId] = useState(startingGroup);
  const [paidById, setPaidById] = useState(
    existing?.paidById ?? ledger.groups.find((group) => group.id === startingGroup)?.memberIds[0] ?? "",
  );
  const [split, setSplit] = useState<SplitMode>(existing?.split ?? "equal");
  const [selected, setSelected] = useState<string[]>(
    existing?.shares.map((share) => share.personId) ??
      ledger.groups.find((group) => group.id === startingGroup)?.memberIds ??
      [],
  );
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    if (!existing || existing.split !== "amounts") return {};
    return Object.fromEntries(
      existing.shares.map((share) => [share.personId, centsToInput(share.amountCents)]),
    );
  });
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const group = ledger.groups.find((item) => item.id === groupId) ?? null;
  const optionIds = useMemo(() => {
    const members = group?.memberIds ?? [];
    const extras = selected.filter((id) => !members.includes(id));
    return [...members, ...extras];
  }, [group, selected]);
  const orderedSelected = optionIds.filter((id) => selected.includes(id));
  const amountCents = parseDollars(amount);

  const equalPreview =
    split === "equal" && amountCents && amountCents > 0 && orderedSelected.length > 0
      ? equalShares(amountCents, orderedSelected)
      : null;

  const draft = buildDraft({
    description,
    amountCents,
    groupId,
    paidById,
    split,
    orderedSelected,
    amounts,
  });
  const problem = draft.ok ? validateExpenseInput(ledger, draft.input) : draft.error;
  const showProblem = submitted && problem;

  function chooseGroup(nextGroupId: string) {
    const nextGroup = ledger.groups.find((item) => item.id === nextGroupId);
    const members = nextGroup?.memberIds ?? [];
    setGroupId(nextGroupId);
    setSelected(members);
    setAmounts({});
    if (!paidById) setPaidById(members[0] ?? "");
  }

  function togglePerson(personId: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? current.includes(personId)
          ? current
          : [...current, personId]
        : current.filter((id) => id !== personId),
    );
  }

  function fillEqually() {
    if (!amountCents || amountCents <= 0 || orderedSelected.length === 0) return;
    const shares = equalShares(amountCents, orderedSelected);
    setAmounts(Object.fromEntries(shares.map((share) => [share.personId, centsToInput(share.amountCents)])));
    setSplit("amounts");
  }

  const payer = ledger.people.find((person) => person.id === paidById) ?? null;
  const payerInGroup = payer ? (group?.memberIds.includes(payer.id) ?? false) : true;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (!draft.ok || problem) return;
        const result = existing
          ? updateExpense(existing.id, draft.input)
          : addExpense(draft.input);
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        onClose();
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4">
        <DialogHeader className="pr-8">
          <DialogTitle>{existing ? "Edit expense" : "Add an expense"}</DialogTitle>
          <DialogDescription>
            Say who paid, which group shares it, and whether the split is equal or exact.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend id="expense-group-label" className="text-sm font-medium">
              Which group is this shared with?
            </legend>
            {ledger.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create a group before adding an expense.</p>
            ) : (
              <RadioGroup
                value={groupId}
                onValueChange={(value) => chooseGroup(value)}
                aria-labelledby="expense-group-label"
                className="max-h-44 gap-1.5 overflow-y-auto pr-1"
              >
                {ledger.groups.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={item.id} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {memberNames(ledger.people, item.memberIds)}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="expense-description">What was it?</Label>
              <Input
                id="expense-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Dinner, rent, train tickets"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label id="expense-amount-label" htmlFor="expense-amount">
                Amount
              </Label>
              <MoneyField
                id="expense-amount"
                labelledBy="expense-amount-label"
                value={amount}
                onChange={setAmount}
                size="lg"
                invalid={submitted && (amountCents === null || amountCents <= 0)}
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Who paid?</legend>
            <div className="flex flex-wrap gap-2">
              {ledger.people.map((person) => {
                const active = paidById === person.id;
                return (
                  <Button
                    key={person.id}
                    type="button"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => setPaidById(person.id)}
                  >
                    {person.name}
                  </Button>
                );
              })}
            </div>
            {payer && !payerInGroup ? (
              <p className="text-sm text-muted-foreground">
                {payer.name} is not in this group, so the full amount is owed back unless you add them as a member.
              </p>
            ) : null}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend id="split-mode-label" className="text-sm font-medium">
              How should it be split?
            </legend>
            <RadioGroup
              value={split}
              onValueChange={(value) => setSplit(value as SplitMode)}
              aria-labelledby="split-mode-label"
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer gap-3 rounded-xl border px-3 py-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
                <RadioGroupItem value="equal" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Equally</span>
                  <span className="block text-xs text-muted-foreground">
                    Same share for each person. Leftover cents go to the first names.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-xl border px-3 py-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
                <RadioGroupItem value="amounts" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Exact amounts</span>
                  <span className="block text-xs text-muted-foreground">
                    Type what each person owes. The shares must match the total.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium">Who is included?</legend>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillEqually}
                disabled={!amountCents || orderedSelected.length === 0}
              >
                Start from an equal split
              </Button>
            </div>
            {optionIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Choose a group with members.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {optionIds.map((personId) => {
                  const person = ledger.people.find((item) => item.id === personId);
                  const checked = selected.includes(personId);
                  const checkboxId = `share-${personId}`;
                  const inGroup = group?.memberIds.includes(personId) ?? false;
                  return (
                    <li
                      key={personId}
                      className="flex items-center gap-3 rounded-xl border px-3 py-2 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        onCheckedChange={(next) => togglePerson(personId, next)}
                      />
                      <label
                        id={`share-label-${personId}`}
                        htmlFor={checkboxId}
                        className="min-w-0 flex-1 cursor-pointer text-sm"
                      >
                        <span className="font-medium">{person?.name ?? "Someone"}</span>
                        {!inGroup ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            No longer in this group
                          </span>
                        ) : null}
                      </label>
                      {split === "amounts" && checked ? (
                        <div className="w-28">
                          <MoneyField
                            value={amounts[personId] ?? ""}
                            onChange={(value) =>
                              setAmounts((current) => ({ ...current, [personId]: value }))
                            }
                            labelledBy={`share-label-${personId}`}
                          />
                        </div>
                      ) : null}
                      {split === "equal" && checked && equalPreview ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatMoney(
                            equalPreview.find((share) => share.personId === personId)?.amountCents ?? 0,
                          )}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <SplitHint
              split={split}
              amountCents={amountCents}
              orderedSelected={orderedSelected}
              amounts={amounts}
              equalPreview={equalPreview}
            />
          </fieldset>

          {showProblem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{existing ? "Save expense" : "Add expense"}</Button>
      </div>
    </form>
  );
}

function SplitHint({
  split,
  amountCents,
  orderedSelected,
  amounts,
  equalPreview,
}: {
  split: SplitMode;
  amountCents: number | null;
  orderedSelected: string[];
  amounts: Record<string, string>;
  equalPreview: { personId: string; amountCents: number }[] | null;
}) {
  if (split === "equal") {
    if (!equalPreview) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter an amount and choose who shares it.
        </p>
      );
    }
    const hasZero = equalPreview.some((share) => share.amountCents === 0);
    return (
      <p className="text-sm text-muted-foreground">
        {hasZero
          ? "A few leftover cents are handed out one at a time, so someone can land on $0.00."
          : `${orderedSelected.length} ${orderedSelected.length === 1 ? "person" : "people"} · ${formatMoney(shareSum(equalPreview))} total.`}
      </p>
    );
  }

  if (!amountCents || amountCents <= 0) {
    return <p className="text-sm text-muted-foreground">Enter the total, then fill each share.</p>;
  }
  if (orderedSelected.length === 0) {
    return <p className="text-sm text-muted-foreground">Choose at least one person.</p>;
  }
  const parsed = orderedSelected.map((personId) => parseDollars(amounts[personId] ?? ""));
  if (parsed.some((cents) => cents === null)) {
    return <p className="text-sm text-muted-foreground">Enter an amount for each person included.</p>;
  }
  const assigned = parsed.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
  const remainder = amountCents - assigned;
  if (remainder === 0) {
    return <p className="text-sm text-muted-foreground">The amounts match the total.</p>;
  }
  return (
    <p className="text-sm text-owe" role="status">
      {remainder > 0
        ? `${formatMoney(remainder)} still to assign.`
        : `${formatMoney(-remainder)} over the total.`}
    </p>
  );
}

function memberNames(
  people: { id: string; name: string }[],
  memberIds: string[],
): string {
  const names = memberIds
    .map((id) => people.find((person) => person.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "No members";
}

function buildDraft(input: {
  description: string;
  amountCents: number | null;
  groupId: string;
  paidById: string;
  split: SplitMode;
  orderedSelected: string[];
  amounts: Record<string, string>;
}): { ok: true; input: ExpenseInput } | { ok: false; error: string } {
  if (!input.groupId) return { ok: false, error: "Choose the group this cost is shared with." };
  if (!input.description.trim()) return { ok: false, error: "Add a short description." };
  if (input.amountCents === null || input.amountCents <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (!input.paidById) return { ok: false, error: "Choose who paid." };
  if (input.orderedSelected.length === 0) {
    return { ok: false, error: "Choose at least one person to split this with." };
  }

  if (input.split === "equal") {
    return {
      ok: true,
      input: {
        description: input.description,
        amountCents: input.amountCents,
        paidById: input.paidById,
        groupId: input.groupId,
        split: "equal",
        shares: equalShares(input.amountCents, input.orderedSelected),
      },
    };
  }

  const shares = [];
  for (const personId of input.orderedSelected) {
    const amountCents = parseDollars(input.amounts[personId] ?? "");
    if (amountCents === null) {
      return { ok: false, error: "Enter an amount for each person included." };
    }
    shares.push({ personId, amountCents });
  }
  return {
    ok: true,
    input: {
      description: input.description,
      amountCents: input.amountCents,
      paidById: input.paidById,
      groupId: input.groupId,
      split: "amounts",
      shares,
    },
  };
}
