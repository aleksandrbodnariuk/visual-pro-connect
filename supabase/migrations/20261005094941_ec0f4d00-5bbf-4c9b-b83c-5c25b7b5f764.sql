DO $$
DECLARE
  r record;
  guest_keep text[] := ARRAY['get_safe_public_profiles_by_ids','get_safe_public_profiles','get_minimal_public_profiles','get_specialists',
    'search_marketplace_listings','user_exists_by_phone','get_detailed_profile','has_role','is_user_admin','check_admin_access','get_users_last_seen'];
  client_rpcs text[] := ARRAY['get_safe_public_profiles_by_ids','has_role','get_users_for_admin','check_admin_access','get_specialists','get_safe_public_profiles',
    'has_stock_market_access','get_confirmed_orders_for_forecast','is_user_admin','get_my_profile','get_all_shareholders_shares','admin_delete_order_financials',
    'reject_share_transaction','get_users_last_seen','get_user_conversations','get_or_create_direct_conversation','approve_share_transaction',
    'accept_representative_invite','user_exists_by_phone','update_member_role','update_conversation_title','update_conversation_description',
    'update_conversation_avatar','set_stock_market_access','send_friend_request_notification','search_marketplace_listings','remove_member_from_group',
    'reject_certificate_purchase','process_order_profit','process_ad_order','open_party_chat','mark_spec_payout_paid','mark_rep_payout_paid',
    'mark_payout_paid','mark_conversation_read','leave_conversation','get_user_friends','get_upcoming_client_greetings','get_team_tree',
    'get_storage_admin_db_stats','get_minimal_public_profiles','get_group_stats','get_detailed_profile','ensure_user_profile','create_share_listing',
    'create_group_conversation','confirm_spec_payout','confirm_rep_payout','confirm_payout','claim_vip_monthly_bonus','claim_vip_birthday_gift',
    'cancel_share_transaction','campaign_results','campaign_progress','approve_vip_purchase','approve_certificate_purchase','admin_test_data_summary',
    'admin_force_confirm_spec_payout','admin_force_confirm_rep_payout','admin_force_confirm_payout','admin_finance_integrity_report',
    'admin_delete_all_test_data','add_members_to_group','get_my_representative_stats','get_representative_stats','get_top_representatives',
    'get_analytics_overview','get_conversion_stats','get_visit_stats','get_financial_stats','get_financial_audit_log','get_issued_shares_count',
    'get_title_by_share_percent','get_user_vip_tier','get_vip_discount_percent','has_active_vip','get_user_roles_array','get_user_by_phone',
    'get_conversation_member_role','is_conversation_member','get_safe_public_profiles'];
  in_policy boolean;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prorettype = 'trigger'::regtype AS is_trg
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_policies pl
      WHERE pl.qual ~ ('\m' || r.proname || '\(') OR pl.with_check ~ ('\m' || r.proname || '\(')) INTO in_policy;

    IF NOT (r.proname = ANY(guest_keep)) AND NOT in_policy THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
      -- make sure signed-in users keep access to functions they need
      IF r.proname = ANY(client_rpcs) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
      END IF;
    END IF;

    IF (r.is_trg OR NOT (r.proname = ANY(client_rpcs))) AND NOT in_policy AND NOT (r.proname = ANY(guest_keep)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', r.proname, r.args);
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;

ALTER FUNCTION public._path_from_url(text, text) SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_secrets') THEN
    CREATE POLICY app_secrets_service_only ON public.app_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;