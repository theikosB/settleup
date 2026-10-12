import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SettlementTransfer = {
  key: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  amountCents: number;
  onMarkPaid?: () => void;
  onAdjust?: () => void;
};

export function SettlementPanel({
  eyebrow,
  title,
  description,
  rows,
  transfers,
  emptyTitle,
  emptyBody,
  tone = "primary",
}: {
  eyebrow: string;
  title: string;
  description: string;
  rows: { id: string; name: string; balanceCents: number }[];
  transfers: SettlementTransfer[];
  emptyTitle: string;
  emptyBody: string;
  tone?: "primary" | "plain";
}) {
  const open = transfers.length > 0;
  const outstanding = rows.filter((row) => row.balanceCents !== 0);

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div
        className={cn(
          "px-5 py-4",
          tone === "primary" ? "bg-primary text-primary-foreground" : "border-b",
        )}
      >
        <p
          className={cn(
            "text-[0.68rem] font-semibold tracking-[0.16em] uppercase",
            tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {eyebrow}
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h2
            className={cn(
              "font-heading tracking-tight",
              tone === "primary" ? "text-3xl leading-none" : "text-2xl leading-none",
            )}
          >
            {title}
          </h2>
          <p className="shrink-0 font-heading text-lg leading-none">
            {open ? `${transfers.length} ${transfers.length === 1 ? "payment" : "payments"}` : "All even"}
          </p>
        </div>
        <p
          className={cn(
            "mt-2 max-w-xl text-sm",
            tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      </div>

      {open ? (
        <div>
          {outstanding.length > 0 ? (
            <ul className="divide-y border-b px-5">
              {outstanding.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <PersonMark id={row.id} name={row.name} size="sm" />
                    <span className="truncate text-sm font-medium">{row.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[0.68rem] tracking-wide text-muted-foreground uppercase">
                      {row.balanceCents > 0 ? "is owed" : "owes"}
                    </span>
                    <span
                      className={cn(
                        "font-heading text-lg tabular-nums",
                        row.balanceCents > 0 ? "text-owed" : "text-owe",
                      )}
                    >
                      {formatMoney(Math.abs(row.balanceCents))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <ol className="px-5">
            {transfers.map((transfer) => (
              <li
                key={transfer.key}
                className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <PersonMark id={transfer.from.id} name={transfer.from.name} size="sm" />
                  <p className="min-w-0 text-sm">
                    <span className="font-medium">{transfer.from.name}</span>
                    <span className="text-muted-foreground"> pays </span>
                    <span className="font-medium">{transfer.to.name}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="font-heading text-2xl tabular-nums tracking-tight">
                    {formatMoney(transfer.amountCents)}
                  </p>
                  {transfer.onMarkPaid ? (
                    <div className="flex gap-1.5">
                      <Button type="button" size="sm" onClick={transfer.onMarkPaid}>
                        Mark paid
                      </Button>
                      {transfer.onAdjust ? (
                        <Button type="button" size="sm" variant="outline" onClick={transfer.onAdjust}>
                          Adjust
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="px-5 py-8">
          <p className="font-heading text-2xl tracking-tight">{emptyTitle}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{emptyBody}</p>
        </div>
      )}
    </section>
  );
}
