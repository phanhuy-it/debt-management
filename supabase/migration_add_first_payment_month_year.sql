-- Add first payment month/year for installment loans (BANK/APP)
-- Format: "YYYY-MM"

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS first_payment_month_year TEXT;

