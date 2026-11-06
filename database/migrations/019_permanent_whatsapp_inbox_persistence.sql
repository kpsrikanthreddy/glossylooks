-- =========================================================================
-- Migration 019: Permanent WhatsApp Inbox & Customer Chat Message Persistence
-- =========================================================================
-- 1. Verifies/creates public.whatsapp_conversations table
-- 2. Verifies/creates public.whatsapp_messages table with full CRM columns
-- 3. Adds source, source_badge, metadata, timestamps for permanent history
-- 4. Ensures meta_message_id unique index for webhook idempotency
-- 5. Enables RLS and permissive policies for authenticated access
-- 6. Reloads PostgREST schema cache
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
    source_channel TEXT DEFAULT 'WHATSAPP',
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_inbound_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wa_conv_salon_phone UNIQUE (salon_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_salon ON public.whatsapp_conversations (salon_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_branch ON public.whatsapp_conversations (branch_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON public.whatsapp_conversations (customer_phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON public.whatsapp_conversations (status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.whatsapp_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_source ON public.whatsapp_conversations (source_channel);

-- 2. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id TEXT NOT NULL DEFAULT 'tgl-gachibowli-main',
    branch_id TEXT DEFAULT 'tgl-gachibowli-main',
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    meta_message_id TEXT, -- wamid from Meta Graph API
    direction TEXT NOT NULL, -- 'INBOUND' or 'OUTBOUND'
    source TEXT DEFAULT 'WHATSAPP', -- 'WHATSAPP', 'WEBSITE_ENQUIRY', 'AUTOMATION', 'TEMPLATE', 'ADMIN'
    source_badge TEXT DEFAULT 'WHATSAPP',
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'interactive', 'button', 'template', 'image', 'document', 'system'
    text_body TEXT,
    template_name TEXT,
    template_params JSONB,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read', 'failed', 'received'
    error_code TEXT,
    error_message TEXT,
    sent_by_user_id TEXT,
    sent_by_user_name TEXT,
    reply_to_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Ensure all necessary columns exist on existing table instances
DO $$
BEGIN
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WHATSAPP';
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS source_badge TEXT DEFAULT 'WHATSAPP';
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS text_body TEXT;
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_user_id TEXT;
    ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_user_name TEXT;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON public.whatsapp_messages (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_source_badge ON public.whatsapp_messages (source_badge);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id) WHERE meta_message_id IS NOT NULL;

-- 3. Row Level Security (RLS)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS allow_all_whatsapp_conversations ON public.whatsapp_conversations;
    CREATE POLICY allow_all_whatsapp_conversations ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS allow_all_whatsapp_messages ON public.whatsapp_messages;
    CREATE POLICY allow_all_whatsapp_messages ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 4. Grant table privileges to standard roles
GRANT ALL ON public.whatsapp_conversations TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_messages TO postgres, anon, authenticated, service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
