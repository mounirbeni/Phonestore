import { Check, ChevronRight, X } from "lucide-react";
import { startsWithCross, startsWithEmoji, stripEmoji } from "@/lib/emoji";

/**
 * Product description with the emoji markers of imported texts turned into icons: a marked short line becomes a
 * sub-heading, a marked sentence a check (or cross) bullet; any other emoji is dropped.
 */
export function ProductDescription({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).flatMap((b) => b.split("\n")).map((l) => l.trimEnd()).filter((l) => l.trim());
  return (
    <div className="mt-4 space-y-2.5 leading-relaxed text-fg-2">
      {blocks.map((raw, i) => {
        const marked = startsWithEmoji(raw);
        const line = stripEmoji(raw);
        if (!line) return null;
        if (!marked) return <p key={i}>{line}</p>;
        const heading = line.length <= 48 && !/[.!?;:,]$/.test(line) && !/\s:\s/.test(line);
        if (heading)
          return (
            <h3 key={i} className="flex items-center gap-2 pt-3 font-bold text-fg">
              <ChevronRight className="h-4 w-4 shrink-0 text-brand rtl:rotate-180" aria-hidden="true" />
              {line}
            </h3>
          );
        const Icon = startsWithCross(raw) ? X : Check;
        return (
          <p key={i} className="flex items-start gap-2.5">
            <Icon className={startsWithCross(raw) ? "mt-1 h-4 w-4 shrink-0 text-hot" : "mt-1 h-4 w-4 shrink-0 text-ok"} aria-hidden="true" />
            <span>{line}</span>
          </p>
        );
      })}
    </div>
  );
}
