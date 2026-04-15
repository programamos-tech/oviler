/** Reparte ingreso tienda (total − delivery) entre efectivo y transfer (incluye mixto). Usado en dashboard y sucursales. */
export function cashTransferFromLine(
  total: number,
  deliveryFee: number,
  paymentMethod: string,
  amountCash: number | null,
  amountTransfer: number | null
): { cash: number; transfer: number } {
  const df = deliveryFee || 0;
  const saleAmount = total - df;
  if (paymentMethod === "cash") {
    return { cash: saleAmount, transfer: 0 };
  }
  if (paymentMethod === "transfer") {
    return { cash: 0, transfer: saleAmount };
  }
  if (paymentMethod === "mixed") {
    const ac = Number(amountCash ?? 0);
    const at = Number(amountTransfer ?? 0);
    const sumMixed = ac + at;
    if (sumMixed > 0 && Math.abs(sumMixed - total) < 0.01) {
      const deliveryRatio = total > 0 ? df / total : 0;
      return {
        cash: ac - ac * deliveryRatio,
        transfer: at - at * deliveryRatio,
      };
    }
    if (sumMixed > 0) {
      const ratio = saleAmount / sumMixed;
      const cashPart = Math.round(ac * ratio);
      return { cash: cashPart, transfer: saleAmount - cashPart };
    }
    return { cash: saleAmount, transfer: 0 };
  }
  return { cash: 0, transfer: 0 };
}

export type CreditPaymentSplitRow = {
  amount: number;
  payment_method: string;
  amount_cash: number | null;
  amount_transfer: number | null;
  /** Reembolso por garantía: reduce deuda pero no es ingreso de caja (el egreso ya salió). */
  payment_source?: string | null;
};

export function addCreditPaymentSplits(
  payments: CreditPaymentSplitRow[] | null | undefined,
  cash: number,
  transfer: number
): { cash: number; transfer: number } {
  let c = cash;
  let t = transfer;
  (payments ?? []).forEach((p) => {
    if (p.payment_source === "warranty_refund") return;
    const inc = cashTransferFromLine(
      Number(p.amount),
      0,
      p.payment_method,
      p.amount_cash,
      p.amount_transfer
    );
    c += inc.cash;
    t += inc.transfer;
  });
  return { cash: c, transfer: t };
}
