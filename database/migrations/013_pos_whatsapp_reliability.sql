-- =========================================================================
-- Migration 013: POS Billing Reliability & WhatsApp Delivery Architecture
-- Adds idempotency, async delivery tracking, retry scheduling, and logs.
-- =========================================================================

-- 1. Ensure idempotency & WhatsApp status columns exist on public.orders
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'queued';

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS whatsapp_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON public.orders (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_branch_id 
ON public.orders (branch_id);

CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_status 
ON public.orders (whatsapp_status);

-- 2. Ensure public.whatsapp_message_logs exists with all delivery & retry fields
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    order_id TEXT,
    branch_id TEXT,
    customer_name TEXT,
    recipient_number TEXT NOT NULL,
    template_name TEXT NOT NULL,
    job_type TEXT DEFAULT 'customer_feedback',
    status TEXT DEFAULT 'queued',
    sender_phone_number_id TEXT,
    meta_message_id TEXT,
    error_message TEXT,
    diagnostics TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist if table was already created
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS appointment_id TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS recipient_number TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'customer_feedback';
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued';
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS sender_phone_number_id TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS meta_message_id TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS diagnostics TEXT;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS public.whatsapp_message_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_order_id ON public.whatsapp_message_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_message_logs (status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_meta_id ON public.whatsapp_message_logs (meta_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_next_retry ON public.whatsapp_message_logs (next_retry_at) WHERE status = 'retrying';

-- 3. Ensure scheduled_feedback_jobs supports order links and retry attempts
CREATE TABLE IF NOT EXISTS public.scheduled_feedback_jobs (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    order_id TEXT,
    branch_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    meta_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE IF EXISTS public.scheduled_feedback_jobs ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.scheduled_feedback_jobs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.scheduled_feedback_jobs ADD COLUMN IF NOT EXISTS meta_message_id TEXT;
ALTER TABLE IF EXISTS public.scheduled_feedback_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_scheduled ON public.scheduled_feedback_jobs (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_order_id ON public.scheduled_feedback_jobs (order_id);
