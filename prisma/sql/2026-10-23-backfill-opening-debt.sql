-- One-time: "Nợ đầu kỳ" is now the only source of debt from before the app.
-- Copy the "Dư nợ cũ" typed on each customer's oldest quotation into Customer."openingDebt".
-- Customers that already have an opening debt are left unchanged. Safe to run more than once.
UPDATE "Customer" AS c
SET "openingDebt" = oldest."previousDebt"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "previousDebt"
  FROM "Quotation"
  ORDER BY "customerId", "quotationDate" ASC, "createdAt" ASC
) AS oldest
WHERE oldest."customerId" = c."id"
  AND c."openingDebt" = 0
  AND oldest."previousDebt" > 0;
