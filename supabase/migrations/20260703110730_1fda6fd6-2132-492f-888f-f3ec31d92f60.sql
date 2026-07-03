
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS closes_at timestamptz NULL;

-- Prevent same user casting same option twice
CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_unique_user_option
  ON public.poll_votes (poll_id, user_id, option_id);

-- Trigger: enforce closed polls and single-choice constraint
CREATE OR REPLACE FUNCTION public.enforce_poll_vote_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_multiple boolean;
  v_closes_at timestamptz;
  v_existing integer;
BEGIN
  SELECT allow_multiple, closes_at
    INTO v_allow_multiple, v_closes_at
    FROM public.polls
    WHERE id = NEW.poll_id;

  IF v_closes_at IS NOT NULL AND v_closes_at <= now() THEN
    RAISE EXCEPTION 'Poll is closed' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT v_allow_multiple THEN
    SELECT count(*) INTO v_existing
      FROM public.poll_votes
      WHERE poll_id = NEW.poll_id
        AND user_id = NEW.user_id;
    IF v_existing > 0 THEN
      RAISE EXCEPTION 'User has already voted in this single-choice poll' USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_poll_vote_rules ON public.poll_votes;
CREATE TRIGGER trg_enforce_poll_vote_rules
  BEFORE INSERT ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_poll_vote_rules();
