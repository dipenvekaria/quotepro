-- ============================================================================
-- accept_invitation: check who is accepting
-- ============================================================================
-- The original overwrote the CURRENT session user's company and role with
-- whatever the invitation carried, checking only that the token was valid:
--
--   UPDATE public.users SET company_id = …, role = … WHERE id = auth.uid();
--
-- Two failures follow from that.
--
-- 1. An owner who opens an invitation they sent — which is the obvious thing to
--    do when checking the link works — is demoted to the invited role. Observed
--    in production on 2026-08-15: a company was left with zero owners, so
--    nobody could edit its catalog, settings, or invite anyone.
--
-- 2. Invitations are emailed, and email gets forwarded. Anyone signed in who
--    opened someone else's link would be moved into that company, leaving their
--    own. The 128-bit token makes guessing impractical, but it was never
--    intended to be the only check.
--
-- The invitation names an email address. That is who it is for.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_email        text;
  v_company_id   uuid;
  v_inv          public.invitations;
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

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT company_id INTO v_company_id FROM public.users WHERE id = v_uid;

  -- The invitation is addressed to someone. Only they may accept it.
  IF v_email IS DISTINCT FROM lower(trim(v_inv.email)) THEN
    RAISE EXCEPTION 'This invitation is for %, not %', v_inv.email, coalesce(v_email, 'you')
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Already in a company. Accepting would move them out of it, which is far too
  -- consequential to happen as a side effect of opening a link — and is exactly
  -- how a company ended up with no owner.
  IF v_company_id IS NOT NULL AND v_company_id IS DISTINCT FROM v_inv.company_id THEN
    RAISE EXCEPTION 'You already belong to a workspace. Leave it before joining another.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Same company already: nothing to join. Silently re-applying the invited role
  -- here is what demoted an owner who opened their own invitation.
  IF v_company_id IS NOT NULL AND v_company_id = v_inv.company_id THEN
    UPDATE public.invitations
       SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
     WHERE id = v_inv.id;
    RETURN v_inv.company_id;
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

-- ============================================================================
-- A company must keep an owner
-- ============================================================================
-- Defence in depth. Even with the above, a role change elsewhere should not be
-- able to leave a workspace unmanageable — an ownerless company cannot edit its
-- own catalog or invite anyone back.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'owner' AND NEW.role IS DISTINCT FROM 'owner'
     AND OLD.company_id IS NOT NULL THEN
    IF (SELECT count(*) FROM public.users
         WHERE company_id = OLD.company_id AND role = 'owner' AND id <> OLD.id) = 0 THEN
      RAISE EXCEPTION 'A workspace needs at least one owner. Make someone else an owner first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_keep_an_owner ON public.users;
CREATE TRIGGER users_keep_an_owner
  BEFORE UPDATE OF role, company_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();
