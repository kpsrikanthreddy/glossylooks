-- =========================================================================
-- Migration 016: Automated Daily Stylist Sales Reporting Through WhatsApp
-- =========================================================================
-- 1. Creates public.daily_sales_reports table for idempotent logging
-- 2. Enforces unique constraint on (report_date, recipient_phone, report_type)
-- 3. Enables Row Level Security with permissive policy
-- 4. Reloads PostgREST schema cache
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.daily_sales_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    report_type TEXT NOT NULL, -- 'stylist_report' or 'owner_summary'
    recipient_type TEXT NOT NULL, -- 'stylist' or 'owner'
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    stylist_id TEXT,
    stylist_name TEXT,
    branch_id TEXT DEFAULT 'tgl-gachibowli-main',
    bills_count INTEGER NOT NULL DEFAULT 0,
    services_count INTEGER NOT NULL DEFAULT 0,
    total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    upi_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    breakdown_text TEXT,
    breakdown_json JSONB,
    template_name TEXT NOT NULL,
    meta_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed', 'retrying', 'skipped_duplicate'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_sales_reports_idempotency UNIQUE (report_date, recipient_phone, report_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_date ON public.daily_sales_reports (report_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_recipient ON public.daily_sales_reports (recipient_phone);
CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_status ON public.daily_sales_reports (status);

-- Enable RLS and permissive policy for authenticated / service role
ALTER TABLE public.daily_sales_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'daily_sales_reports' AND policyname = 'allow_all_daily_sales_reports'
    ) THEN
        CREATE POLICY allow_all_daily_sales_reports ON public.daily_sales_reports FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
