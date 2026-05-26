/** Marcadores de datos demo en seeds SQL ([Hist demo], FV-HIST-, etc.). */

const HIST_DEMO_PREFIX = "[Hist demo]";

export function isHistDemoNotes(value: string | null | undefined): boolean {
  return String(value ?? "").trimStart().startsWith(HIST_DEMO_PREFIX);
}

export function isHistDemoExpenseConcept(concept: string | null | undefined): boolean {
  return isHistDemoNotes(concept);
}

export function isHistDemoWarrantyReason(reason: string | null | undefined): boolean {
  return isHistDemoNotes(reason);
}

export function isHistDemoInvoice(invoiceNumber: string | null | undefined): boolean {
  const inv = String(invoiceNumber ?? "");
  return inv.startsWith("FV-HIST-") || inv.startsWith("FV-LIVE-");
}

export function isHistDemoCreditPayment(row: {
  notes?: string | null;
  payment_source?: string | null;
}): boolean {
  return isHistDemoNotes(row.notes);
}
