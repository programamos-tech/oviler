import {
  clientAggregateStatusFromCredits,
  creditRowPending,
  type ClientAggregateStatus,
  type CreditStatus,
} from "@/app/creditos/credit-ui";

export type CreditListRow = {
  id: string;
  customer_id: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  customers: { id: string; name: string } | null;
};

export type GroupedCreditClient = {
  customerId: string;
  name: string;
  credits: CreditListRow[];
  invoiceCount: number;
  totalAmount: number;
  totalPending: number;
  nextDue: string | null;
  aggregateStatus: ClientAggregateStatus;
};

export function groupCreditsByClient(
  rows: CreditListRow[],
  search: string,
  statusFilter: "all" | ClientAggregateStatus
): GroupedCreditClient[] {
  const map = new Map<string, CreditListRow[]>();
  for (const r of rows) {
    const list = map.get(r.customer_id) ?? [];
    list.push(r);
    map.set(r.customer_id, list);
  }

  const out: GroupedCreditClient[] = [];
  for (const [, credits] of map) {
    const first = credits[0];
    const name = first?.customers?.name ?? "Cliente";
    const customerId = first?.customer_id ?? "";
    const totalAmount = credits.reduce((s, c) => s + Number(c.total_amount), 0);
    const totalPending = credits.reduce(
      (s, c) => s + creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at)),
      0
    );
    const open = credits.filter((c) => !c.cancelled_at && c.status !== "cancelled");
    const pendingCredits = open.filter(
      (c) => creditRowPending(Number(c.total_amount), Number(c.amount_paid), false) > 0.005
    );
    let nextDue: string | null = null;
    if (pendingCredits.length) {
      const dates = pendingCredits.map((c) => c.due_date).sort();
      nextDue = dates[0] ?? null;
    }
    out.push({
      customerId,
      name,
      credits,
      invoiceCount: credits.length,
      totalAmount,
      totalPending,
      nextDue,
      aggregateStatus: clientAggregateStatusFromCredits(credits),
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const q = search.trim().toLowerCase();
  let next = !q ? out : out.filter((g) => g.name.toLowerCase().includes(q) || g.customerId.toLowerCase().includes(q));
  if (statusFilter !== "all") {
    next = next.filter((g) => g.aggregateStatus === statusFilter);
  }
  return next;
}
