-- "Giảm giá" on an order: a fixed amount taken off its goods total, with an optional reason.
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "orderDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "discountNote" TEXT;
