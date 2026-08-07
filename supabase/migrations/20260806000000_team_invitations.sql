-- ============================================================================
-- Team invitations
-- ============================================================================
-- Invite a teammate by email + role. Produces a shareable join token (works
-- without email delivery). accept_invitation() joins the current auth user to
-- the inviting company with the invited role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         public.user_role NOT NULL DEFAULT 'technician',
  token        text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status       text NOT NULL DEFAULT 'pending',  -- pending | accepted | revoked
  invited_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_company ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_select ON public.invitations;
CREATE POLICY invitations_select ON public.invitations FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS invitations_insert ON public.invitations;
CREATE POLICY invitations_insert ON public.invitations FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN ('owner', 'office')
  );

DROP POLICY IF EXISTS invitations_update ON public.invitations;
CREATE POLICY invitations_update ON public.invitations FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN ('owner', 'office')
  );

-- Accept an invitation: link the current user to the company + role.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.invitations;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired invitation';
  END IF;

  UPDATE public.users
     SET company_id = v_inv.company_id,
         role       = v_inv.role
   WHERE id = v_uid;

  UPDATE public.invitations
     SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
   WHERE id = v_inv.id;

  RETURN v_inv.company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
