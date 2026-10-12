"use client";

import { useState } from "react";
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
import { useLedger } from "@/lib/ledger-context";

export function GroupDialog({
  open,
  groupId,
  onOpenChange,
  onCreated,
  onDeleted,
}: {
  open: boolean;
  groupId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (groupId: string) => void;
  onDeleted: (groupId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <GroupForm
            key={groupId ?? "new-group"}
            groupId={groupId}
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
            onDeleted={onDeleted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({
  groupId,
  onClose,
  onCreated,
  onDeleted,
}: {
  groupId: string | null;
  onClose: () => void;
  onCreated: (groupId: string) => void;
  onDeleted: (groupId: string) => void;
}) {
  const { ledger, addGroup, updateGroup, removeGroup } = useLedger();
  const existing = ledger.groups.find((group) => group.id === groupId) ?? null;
  const [name, setName] = useState(existing?.name ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(existing?.memberIds ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggle(personId: string, checked: boolean) {
    setMemberIds((current) =>
      checked
        ? current.includes(personId)
          ? current
          : [...current, personId]
        : current.filter((id) => id !== personId),
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const input = { name, memberIds };
        if (existing) {
          const result = updateGroup(existing.id, input);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onClose();
          return;
        }
        const result = addGroup(input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const created = result.ledger.groups[result.ledger.groups.length - 1];
        if (created) onCreated(created.id);
        else onClose();
      }}
    >
      <DialogHeader className="pr-8">
        <DialogTitle>{existing ? "Edit group" : "New group"}</DialogTitle>
        <DialogDescription>
          A group is the circle a cost is split across — a trip, roommates, or one dinner.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lisbon weekend"
            autoFocus
            maxLength={48}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Members</legend>
          {ledger.people.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Add at least two people before creating a group.
            </p>
          ) : (
            <ul className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
              {ledger.people.map((person) => {
                const checked = memberIds.includes(person.id);
                const checkboxId = `member-${person.id}`;
                return (
                  <li key={person.id}>
                    <label
                      htmlFor={checkboxId}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        onCheckedChange={(next) => toggle(person.id, next)}
                      />
                      <span className="text-sm font-medium">{person.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {memberIds.length < 2
              ? "Choose at least two people."
              : `${memberIds.length} people will be offered when an expense is split.`}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {existing ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              const result = removeGroup(existing.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onDeleted(existing.id);
            }}
          >
            Delete group
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{existing ? "Save group" : "Create group"}</Button>
        </div>
      </div>
    </form>
  );
}
