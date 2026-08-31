-- Sesiones y leads del chatbot de calificación en WhatsApp (Cloud API).
-- Solo service_role: el webhook escribe desde el servidor; el panel interno lee.

CREATE TABLE IF NOT EXISTS public.whatsapp_processed_messages (
  wamid TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_bot_sessions (
  wa_id TEXT PRIMARY KEY,
  profile_name TEXT,
  step TEXT NOT NULL DEFAULT 'idle'
    CHECK (step IN ('idle', 'store', 'system', 'demo', 'handoff')),
  store_status TEXT,
  inventory_system TEXT,
  wants_demo BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL,
  profile_name TEXT,
  store_status TEXT NOT NULL,
  inventory_system TEXT NOT NULL,
  wants_demo BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_demo_leads_created
  ON public.whatsapp_demo_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_processed_messages_created
  ON public.whatsapp_processed_messages (created_at);

CREATE OR REPLACE FUNCTION public.whatsapp_bot_sessions_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_bot_sessions_updated_at ON public.whatsapp_bot_sessions;
CREATE TRIGGER trg_whatsapp_bot_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_bot_sessions
FOR EACH ROW
EXECUTE FUNCTION public.whatsapp_bot_sessions_set_updated_at();

ALTER TABLE public.whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_demo_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_processed_messages FROM PUBLIC;
REVOKE ALL ON public.whatsapp_processed_messages FROM anon;
REVOKE ALL ON public.whatsapp_processed_messages FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_processed_messages TO service_role;

REVOKE ALL ON public.whatsapp_bot_sessions FROM PUBLIC;
REVOKE ALL ON public.whatsapp_bot_sessions FROM anon;
REVOKE ALL ON public.whatsapp_bot_sessions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bot_sessions TO service_role;

REVOKE ALL ON public.whatsapp_demo_leads FROM PUBLIC;
REVOKE ALL ON public.whatsapp_demo_leads FROM anon;
REVOKE ALL ON public.whatsapp_demo_leads FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_demo_leads TO service_role;
