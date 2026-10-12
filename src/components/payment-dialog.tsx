"use client";

import { useState } from "react";
import { MoneyField } from "@/components/money-field";
import { Button } from "@/components/ui/button";
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
import { useLedger } from "@/lib/ledger-context";
import { centsToInput, parseDollars } from "@/lib/money";

export type PaymentPreset = {
  fromId: string;
  toId: string;
  amountCents: number;
  groupId: string;
  note: string;
};

export function PaymentDialog({
  open,
  preset,
  onOpenChange,
  onRecorded,
}: {
  open: boolean;
  preset: PaymentPreset | null;
  onOpenChange: (open: boolean) => void;
  onRecorded: (paymentId: string, summary: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && preset ? (
          <PaymentForm
            key={`${preset.groupId}-${preset.fromId}-${preset.toId}-${preset.amountCents}`}
            preset={preset}
            onClose={() => onOpenChange(false)}
            onRecorded={onRecorded}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  preset,
  onClose,
  onRecorded,
}: {
  preset: PaymentPreset;
  onClose: () => void;
  onRecorded: (paymentId: string, summary: string) => void;
}) {
  const { ledger, addPayment } = useLedger();
  const [fromId, setFromId] = useState(preset.fromId);
  const [toId, setToId] = useState(preset.toId);
  const [groupId, setGroupId] = useState(preset.groupId);
  const [amount, setAmount] = useState(centsToInput(preset.amountCents));
  const [note, setNote] = useState(preset.note);
  const [error, setError] = useState<string | null>(null);
  const group = ledger.groups.find((item) => item.id === groupId);
  const pinned = new Set([fromId, toId]);
  const people = group
    ? ledger.people.filter(
        (person) => group.memberIds.includes(person.id) || pinned.has(person.id),
      )
    : ledger.people;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const amountCents = parseDollars(amount);
        if (amountCents === null) {
          setError("Enter an amount greater than zero.");
          return;
        }
        const result = addPayment({
          fromId,
          toId,
          amountCents,
          groupId,
          note,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const payment = result.ledger.payments[result.ledger.payments.length - 1];
        const from = ledger.people.find((person) => person.id === fromId)?.name ?? "Someone";
        const to = ledger.people.find((person) => person.id === toId)?.name ?? "someone";
        if (payment) onRecorded(payment.id, `${from} paid ${to}`);
        onClose();
      }}
    >
      <DialogHeader className="pr-8">
        <DialogTitle>Record a payment</DialogTitle>
        <DialogDescription>
          This is money someone paid back, not a new shared cost. It counts toward the group you choose.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Group</legend>
        <RadioGroup value={groupId} onValueChange={setGroupId} className="max-h-36 gap-1.5 overflow-y-auto">
          {ledger.groups.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
            >
              <RadioGroupItem value={item.id} />
              <span className="text-sm font-medium">{item.name}</span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <PersonPicker label="Who paid" people={people} value={fromId} onChange={setFromId} />
      <PersonPicker label="Who received it" people={people} value={toId} onChange={setToId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label id="payment-amount-label" htmlFor="payment-amount">
            Amount
          </Label>
          <MoneyField
            id="payment-amount"
            labelledBy="payment-amount-label"
            value={amount}
            onChange={setAmount}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-note">Note</Label>
          <Input
            id="payment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Settlement"
            maxLength={80}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Record payment</Button>
      </div>
    </form>
  );
}

function PersonPicker({
  label,
  people,
  value,
  onChange,
}: {
  label: string;
  people: { id: string; name: string }[];
  value: string;
  onChange: (personId: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const active = value === person.id;
          return (
            <Button
              key={person.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => onChange(person.id)}
            >
              {person.name}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
