import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MoneyField({
  id,
  value,
  onChange,
  labelledBy,
  invalid,
  size = "default",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  labelledBy?: string;
  invalid?: boolean;
  size?: "default" | "lg";
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "text-base" : "text-sm",
        )}
        aria-hidden
      >
        $
      </span>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="0.00"
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        className={cn("pl-6 tabular-nums", size === "lg" && "h-11 pl-7 text-lg")}
      />
    </div>
  );
}
