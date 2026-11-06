-- =========================================================================
-- Migration 017: WhatsApp Inbox / Customer Chat Module
-- =========================================================================
-- 1. Creates public.whatsapp_conversations for multi-tenant conversation threads
-- 2. Creates public.whatsapp_messages for inbound and outbound messages
-- 3. Adds unique constraints on meta_message_id for webhook idempotency
-- 4. Enables Row Level Security and permissive policies for authenticated access
-- 5. Reloads PostgREST schema cache
-- =========================================================================

-- 1. WhatsApp Conversations Table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id TEXT NOT NULL DEFAULT 'tgl-gachibowli-main',
    branch_id TEXT DEFAULT 'tgl-gachibowli-main',
    customer_id TEXT,
    wa_phone_number_id TEXT,
    customer_wa_id TEXT,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' or 'CLOSED'
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_inbound_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wa_conv_salon_phone UNIQUE (salon_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_salon ON public.whatsapp_conversations (salon_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_branch ON public.whatsapp_conversations (branch_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON public.whatsapp_conversations (customer_phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON public.whatsapp_conversations (status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.whatsapp_conversations (last_message_at DESC);

-- 2. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id TEXT NOT NULL DEFAULT 'tgl-gachibowli-main',
    branch_id TEXT DEFAULT 'tgl-gachibowli-main',
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    meta_message_id TEXT, -- wamid from Meta Graph API
    direction TEXT NOT NULL, -- 'INBOUND' or 'OUTBOUND'
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'interactive', 'button', 'template', 'image', 'document', 'system'
    text_body TEXT,
    template_name TEXT,
    template_params JSONB,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read', 'failed'
    error_code TEXT,
    error_message TEXT,
    sent_by_user_id TEXT,
    sent_by_user_name TEXT,
    reply_to_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON public.whatsapp_messages (created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id) WHERE meta_message_id IS NOT NULL;

-- 3. Row Level Security (RLS)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_conversations' AND policyname = 'allow_all_whatsapp_conversations'
    ) THEN
        CREATE POLICY allow_all_whatsapp_conversations ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_messages' AND policyname = 'allow_all_whatsapp_messages'
    ) THEN
        CREATE POLICY allow_all_whatsapp_messages ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
