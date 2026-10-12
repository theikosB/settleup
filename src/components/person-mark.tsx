import { initials, personHue } from "@/lib/display";
import { cn } from "@/lib/utils";

export function PersonMark({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        size === "sm" ? "size-7 text-[0.65rem]" : "size-9 text-xs",
      )}
      style={{ backgroundColor: personHue(id) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
