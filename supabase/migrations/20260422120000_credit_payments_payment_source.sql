-- Origen del abono: cobro normal del cliente vs ajuste por reembolso de garantía (no suma como ingreso en caja).
ALTER TABLE credit_payments
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'customer_payment'
  CHECK (payment_source IN ('customer_payment', 'warranty_refund'));

COMMENT ON COLUMN credit_payments.payment_source IS
  'customer_payment = dinero que paga el cliente; warranty_refund = reduce deuda sin ingreso (empareja con egreso de garantía).';
