-- One-time, for the debt workflow fixes. Safe to run more than once. Needs PostgreSQL 13+ for
-- gen_random_uuid() (on older versions run: CREATE EXTENSION IF NOT EXISTS pgcrypto;).

-- 1. Order dates are calendar days stored at UTC midnight. Orders made with the old "Nhân bản" button
--    kept the exact time instead; move them to their day in Vietnam (UTC+7).
UPDATE "Quotation"
SET "quotationDate" = date_trunc('day', "quotationDate" + interval '7 hours')
WHERE "quotationDate" <> date_trunc('day', "quotationDate");

-- 2. "Đã thanh toán" chosen by hand is now recorded as a payment. Record one for every order marked
--    paid without payments covering its goods, dated on the order's day (where the debt report already
--    counted it), so deleting another payment or editing the order later settles it correctly.
INSERT INTO "CustomerPayment" ("id", "customerId", "quotationId", "batchId", "recordedOnQuotationId", "amount", "paidAt", "note", "createdBy")
SELECT gen_random_uuid()::text, o."customerId", o."id", gen_random_uuid()::text, o."id", o.owed,
       o."quotationDate", 'Đánh dấu đã thanh toán', o."createdBy"
FROM (
  SELECT q."id", q."customerId", q."quotationDate", q."createdBy",
         GREATEST(0, ROUND(q."grandTotal" - q."previousDebt"))
           - COALESCE((SELECT SUM(p."amount") FROM "CustomerPayment" p WHERE p."quotationId" = q."id"), 0) AS owed
  FROM "Quotation" q
  WHERE q."status" IN ('PAID', 'ACCEPTED')
) o
WHERE o.owed > 0;
