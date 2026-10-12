"use client";

import { useState } from "react";
import { PersonMark } from "@/components/person-mark";
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
import { useLedger } from "@/lib/ledger-context";
import type { Person } from "@/lib/types";

export function PeopleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { ledger } = useLedger();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>People</DialogTitle>
          <DialogDescription>
            Add everyone who pays for shared things. A group needs at least two.
          </DialogDescription>
        </DialogHeader>
        {open ? <PeopleManager people={ledger.people} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PeopleManager({ people }: { people: Person[] }) {
  const { addPerson } = useLedger();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addPerson(name);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setName("");
          setError(null);
        }}
      >
        <Label htmlFor="person-name">Name</Label>
        <div className="flex gap-2">
          <Input
            id="person-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maya Chen"
            autoFocus
            maxLength={40}
          />
          <Button type="submit">Add</Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {people.length === 0
              ? "Start with the people who share costs."
              : `${people.length} on the ledger.`}
          </p>
        )}
      </form>
      {people.length > 0 ? (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {people.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PersonRow({ person }: { person: Person }) {
  const { renamePerson, removePerson } = useLedger();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const result = renamePerson(person.id, name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setError(null);
  }

  return (
    <li className="rounded-xl border px-3 py-2">
      <div className="flex items-center gap-3">
        <PersonMark id={person.id} name={editing ? name || person.name : person.name} size="sm" />
        {editing ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={`Name for ${person.name}`}
            maxLength={40}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.name}</span>
        )}
        {editing ? (
          <Button type="button" size="sm" onClick={save}>
            Save
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Rename
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const result = removePerson(person.id);
            setError(result.ok ? null : result.error);
          }}
        >
          Remove
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
