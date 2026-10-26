import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function Section({ title, href, linkLabel, children, className, id }: Props) {
  return (
    <section id={id} className={cn("container-x mt-10 sm:mt-24", className)}>
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-8">
        <h2 className="text-[1.4rem] font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        {href && (
          <Link href={href} className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            {linkLabel}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
