-- Última actividad en la app (heartbeat) y presencia aproximada ("en línea").
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_organization_last_seen
ON public.users (organization_id, last_seen_at DESC NULLS LAST);

-- Actualiza last_seen_at solo para el usuario autenticado; throttle ~45s para no saturar.
CREATE OR REPLACE FUNCTION public.touch_user_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET last_seen_at = now()
  WHERE id = auth.uid()
    AND (
      last_seen_at IS NULL
      OR last_seen_at < now() - interval '45 seconds'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_user_last_seen() TO authenticated;

-- No pisar updated_at del perfil cuando solo cambia last_seen_at (heartbeats).
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE OR REPLACE FUNCTION public.users_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_jsonb(NEW::public.users) - 'last_seen_at' - 'updated_at'
     IS DISTINCT FROM to_jsonb(OLD::public.users) - 'last_seen_at' - 'updated_at' THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.users_set_updated_at();
