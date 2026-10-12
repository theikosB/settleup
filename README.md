# Even

Even is a small expense splitter. It keeps a ledger of what each person spends, asks which group a cost belongs to, and splits that cost equally or in exact amounts. When the spending is done, it works out the fewest payments that make everyone even.

Balances stay in this browser (`localStorage`). Nothing is uploaded.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

## How a split works

1. Add the people who share costs.
2. Put them in a group — a trip, a household, a dinner.
3. Add an expense: who paid, which group it is shared with, and either an equal split or an exact amount per person.
4. Read **Who owes whom**. Mark a suggested payment as paid, or record a different amount. Deleting a payment puts the debt back.

Equal splits are stored in cents. Any leftover cent goes to the first people in the group so the shares add up to the total.

On **All activity**, debts are netted across groups. Someone owed for a trip and owing at home can come out as one smaller payment. Settling one group at a time keeps those books separate.

**Load the Lisbon weekend** fills in a sample trip and an apartment so the settlement is already there to read.

## Tests

```bash
npm test
```
