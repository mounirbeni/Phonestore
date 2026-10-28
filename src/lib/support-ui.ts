import type { TicketStatus, TicketType } from "@/db/schema";

/** Dashboard labels (translation keys) and chip colours for tickets. */
export const ticketStatusLabel: Record<TicketStatus, string> = { new: "جديدة", open: "قيد المعالجة", waiting: "بانتظار رد العميل", resolved: "تم الحل", closed: "مغلقة" };
export const ticketStatusChip: Record<TicketStatus, string> = {
  new: "bg-brand text-white",
  open: "bg-warn-50 text-warn",
  waiting: "bg-mist text-ink-2",
  resolved: "bg-ok-50 text-ok",
  closed: "bg-mist text-muted",
};
export const ticketTypeLabel: Record<TicketType, string> = { question: "سؤال", order: "طلب", complaint: "شكوى", return: "إرجاع", warranty: "ضمان", other: "أخرى" };
