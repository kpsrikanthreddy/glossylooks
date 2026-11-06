-- =========================================================================
-- Migration 018: WhatsApp Inbox Fixes & Website Enquiry Integration
-- =========================================================================
-- 1. Enhances whatsapp_conversations with source_channel & metadata
-- 2. Enhances whatsapp_messages with source_badge, received_at & metadata
-- 3. Ensures RLS policies allow complete access for salon operations
-- 4. Reloads PostgREST schema cache
-- =========================================================================

-- 1. Update whatsapp_conversations
ALTER TABLE IF EXISTS public.whatsapp_conversations
    ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'WHATSAPP',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_wa_conv_source ON public.whatsapp_conversations (source_channel);

-- 2. Update whatsapp_messages
ALTER TABLE IF EXISTS public.whatsapp_messages
    ADD COLUMN IF NOT EXISTS source_badge TEXT DEFAULT 'WHATSAPP',
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_wa_msg_source_badge ON public.whatsapp_messages (source_badge);

-- 3. Row Level Security Verification
ALTER TABLE IF EXISTS public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS allow_all_whatsapp_conversations ON public.whatsapp_conversations;
    CREATE POLICY allow_all_whatsapp_conversations ON public.whatsapp_conversations
        FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS allow_all_whatsapp_messages ON public.whatsapp_messages;
    CREATE POLICY allow_all_whatsapp_messages ON public.whatsapp_messages
        FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 4. Grant table privileges
GRANT ALL ON public.whatsapp_conversations TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_messages TO postgres, anon, authenticated, service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
