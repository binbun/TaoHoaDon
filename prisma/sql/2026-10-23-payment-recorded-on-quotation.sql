-- Remember which invoice a payment was recorded on, for "Đã TT" / "Còn lại" in the monthly Excel export.
-- Payments recorded before this change keep NULL (they are not shown as paid on a specific invoice).
ALTER TABLE "CustomerPayment" ADD COLUMN IF NOT EXISTS "recordedOnQuotationId" TEXT;
CREATE INDEX IF NOT EXISTS "CustomerPayment_recordedOnQuotationId_idx" ON "CustomerPayment"("recordedOnQuotationId");
