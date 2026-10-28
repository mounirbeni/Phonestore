import "server-only";

/**
 * A CSV that Excel opens directly in French/Moroccan settings: semicolons, a UTF-8 BOM, every field quoted,
 * and leading formula characters neutralised so a cell can never run as a formula.
 */
export function csvResponse(filename: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => `"${String(v).replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Cents to a plain decimal Excel reads as a number (e.g. 1299.00). */
export const dh = (cents: number) => (cents / 100).toFixed(2);
