-- =========================================================================
-- Migration 021: WhatsApp Messages Compatibility Columns & Permissive RLS
-- =========================================================================
-- Purpose:
-- 1. Adds compatibility columns to public.whatsapp_messages (salon_id, branch_id, business_id,
--    source, sent_at, delivered_at, read_at, failed_at, received_at, metadata)
-- 2. Ensures foreign key and indexes allow fast querying by conversation_id & created_at
-- 3. Guarantees permissive Row Level Security (RLS) policies and role grants
-- 4. Reloads PostgREST schema cache
-- =========================================================================

-- 1. Ensure all columns exist on public.whatsapp_messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'salon_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN salon_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'branch_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN branch_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'business_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN business_id TEXT DEFAULT 'tgl-gachibowli-main';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'source') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN source TEXT DEFAULT 'WHATSAPP';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'source_badge') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN source_badge TEXT DEFAULT 'WHATSAPP';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'sent_at') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'read_at') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'failed_at') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN failed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'received_at') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'metadata') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
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
END $$;

-- 2. Populate text_body & message_body symmetrically
UPDATE public.whatsapp_messages
SET message_body = text_body
WHERE message_body IS NULL AND text_body IS NOT NULL;

UPDATE public.whatsapp_messages
SET text_body = message_body
WHERE text_body IS NULL AND message_body IS NOT NULL;

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv_created ON public.whatsapp_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_direction ON public.whatsapp_messages (direction);
CREATE INDEX IF NOT EXISTS idx_wa_msg_meta_id ON public.whatsapp_messages (meta_message_id);

-- 4. Permissive RLS Policies
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

-- 5. Grants
GRANT ALL ON public.whatsapp_conversations TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_messages TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_webhook_events TO postgres, anon, authenticated, service_role;

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
