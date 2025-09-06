-- Harden audit_logs so only the SECURITY DEFINER function can insert
-- This does not change app behavior; it only prevents direct inserts by clients

-- 1) Revoke write privileges from anon/authenticated on audit_logs
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM anon, authenticated;

-- Keep SELECT privileges as-is; RLS already restricts to admins via policy
-- (No change to existing SELECT permissions to avoid breaking admin views)

-- 2) Add a note for maintainers (optional, harmless)
COMMENT ON TABLE public.audit_logs IS 'Write access restricted. Inserts must go through public.log_audit_event() SECURITY DEFINER function.';