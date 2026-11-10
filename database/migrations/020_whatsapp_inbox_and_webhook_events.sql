-- =========================================================================
-- Migration 020: WhatsApp Inbox, Message Persistence & Webhook Events
-- =========================================================================
-- Purpose:
-- 1. Verifies/creates public.whatsapp_conversations with both business_id & branch_id,
--    customer_phone in E.164, status (open/closed), last_message_preview, last_inbound_at
-- 2. Verifies/creates public.whatsapp_messages with meta_message_id unique,
--    button_reply_id, button_reply_title, message_type, message_body, meta_timestamp
-- 3. Creates public.whatsapp_webhook_events for complete event logging & idempotency
-- 4. Ensures idempotent indexes, RLS policies, and grants for authenticated & service roles
-- =========================================================================

-- 1. WHATSAPP CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL DEFAULT 'tgl-gachibowli-main',
    branch_id TEXT NOT NULL DEFAULT 'tgl-gachibowli-main',
    salon_id TEXT DEFAULT 'tgl-gachibowli-main',
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' or 'closed'
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_preview TEXT,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_inbound_at TIMESTAMP WITH TIME ZONE,
    source_channel TEXT DEFAULT 'WHATSAPP',
    wa_phone_number_id TEXT,
    customer_wa_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist in pre-existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'business_id') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN business_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'branch_id') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN branch_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'salon_id') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN salon_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'last_message_preview') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN last_message_preview TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'last_message_text') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN last_message_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'last_inbound_at') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN last_inbound_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' AND column_name = 'source_channel') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN source_channel TEXT DEFAULT 'WHATSAPP';
    END IF;
END $$;

-- Populate last_message_preview from last_message_text if null
UPDATE public.whatsapp_conversations
SET last_message_preview = last_message_text
WHERE last_message_preview IS NULL AND last_message_text IS NOT NULL;

-- Indexes for whatsapp_conversations
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON public.whatsapp_conversations (customer_phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_branch ON public.whatsapp_conversations (branch_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_business ON public.whatsapp_conversations (business_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.whatsapp_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON public.whatsapp_conversations (status);

-- 2. WHATSAPP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    meta_message_id TEXT,
    direction TEXT NOT NULL, -- 'inbound' or 'outbound'
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'template', 'interactive', 'image', 'document', 'status'
    message_body TEXT,
    text_body TEXT,
    template_name TEXT,
    button_reply_id TEXT,
    button_reply_title TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'read', 'failed', 'received'
    meta_timestamp BIGINT,
    source_badge TEXT DEFAULT 'WHATSAPP',
    sent_by_user_id TEXT,
    sent_by_user_name TEXT,
    error_code TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist in pre-existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'message_body') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN message_body TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'text_body') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN text_body TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'button_reply_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN button_reply_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'button_reply_title') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN button_reply_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'meta_timestamp') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN meta_timestamp BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'source_badge') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN source_badge TEXT DEFAULT 'WHATSAPP';
    END IF;
END $$;

-- Populate message_body from text_body if null
UPDATE public.whatsapp_messages
SET message_body = text_body
WHERE message_body IS NULL AND text_body IS NOT NULL;

UPDATE public.whatsapp_messages
SET text_body = message_body
WHERE text_body IS NULL AND message_body IS NOT NULL;

-- Unique constraint on meta_message_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id) WHERE meta_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv_created ON public.whatsapp_messages (conversation_id, created_at ASC);

-- 3. WHATSAPP WEBHOOK EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE,
    event_type TEXT NOT NULL,
    sender_phone TEXT,
    recipient_phone_number_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'received', -- 'received', 'processed', 'ignored', 'failed'
    error_message TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_wa_event_received ON public.whatsapp_webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_event_status ON public.whatsapp_webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_wa_event_type ON public.whatsapp_webhook_events (event_type);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS allow_all_whatsapp_conversations ON public.whatsapp_conversations;
    CREATE POLICY allow_all_whatsapp_conversations ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS allow_all_whatsapp_messages ON public.whatsapp_messages;
    CREATE POLICY allow_all_whatsapp_messages ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS allow_all_whatsapp_webhook_events ON public.whatsapp_webhook_events;
    CREATE POLICY allow_all_whatsapp_webhook_events ON public.whatsapp_webhook_events FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 5. GRANTS
GRANT ALL ON public.whatsapp_conversations TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_messages TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_webhook_events TO postgres, anon, authenticated, service_role;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
