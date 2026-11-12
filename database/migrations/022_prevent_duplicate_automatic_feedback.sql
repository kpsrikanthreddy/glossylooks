-- =========================================================================
-- Migration 022: Prevent Duplicate Automatic WhatsApp Feedback Messages
-- =========================================================================
-- Purpose:
-- 1. Enforces unique database constraints on scheduled_feedback_jobs per appointment_id & order_id
-- 2. Adds feedback_source ('AUTO_FEEDBACK' vs 'MANUAL_FEEDBACK') and tracking columns
-- 3. Adds feedback tracking columns on public.appointments
-- 4. Reloads PostgREST schema cache
-- =========================================================================

-- 1. Add feedback tracking columns to public.appointments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback_whatsapp_status') THEN
        ALTER TABLE public.appointments ADD COLUMN feedback_whatsapp_status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback_whatsapp_scheduled_at') THEN
        ALTER TABLE public.appointments ADD COLUMN feedback_whatsapp_scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback_whatsapp_sent_at') THEN
        ALTER TABLE public.appointments ADD COLUMN feedback_whatsapp_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback_whatsapp_message_id') THEN
        ALTER TABLE public.appointments ADD COLUMN feedback_whatsapp_message_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback_whatsapp_source') THEN
        ALTER TABLE public.appointments ADD COLUMN feedback_whatsapp_source TEXT DEFAULT 'AUTO_FEEDBACK';
    END IF;
END $$;

-- 2. Add feedback_source to public.orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'feedback_whatsapp_source') THEN
        ALTER TABLE public.orders ADD COLUMN feedback_whatsapp_source TEXT DEFAULT 'AUTO_FEEDBACK';
    END IF;
END $$;

-- 3. Enhance scheduled_feedback_jobs with feedback_source and claiming fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_feedback_jobs' AND column_name = 'feedback_source') THEN
        ALTER TABLE public.scheduled_feedback_jobs ADD COLUMN feedback_source TEXT DEFAULT 'AUTO_FEEDBACK';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_feedback_jobs' AND column_name = 'claimed_at') THEN
        ALTER TABLE public.scheduled_feedback_jobs ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. Database-level unique constraints to guarantee idempotency
-- Prevent more than one active/pending automatic feedback job per appointment_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_sfj_appointment_feedback
ON public.scheduled_feedback_jobs (appointment_id)
WHERE appointment_id IS NOT NULL AND (job_type IS NULL OR job_type = 'customer_feedback');

-- Prevent more than one active/pending automatic feedback job per order_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_sfj_order_feedback
ON public.scheduled_feedback_jobs (order_id)
WHERE order_id IS NOT NULL AND (job_type IS NULL OR job_type = 'customer_feedback');

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
