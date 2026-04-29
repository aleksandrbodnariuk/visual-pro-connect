import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET request returns the VAPID public key for frontend subscription
  if (req.method === 'GET') {
    const vapidPublicKey = (Deno.env.get('VAPID_PUBLIC_KEY') || '').replace(/^"|"$/g, '').trim();
    return new Response(
      JSON.stringify({ vapidPublicKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // AUTH: require either valid internal secret (server-to-server / triggers)
    // or an authenticated admin user JWT.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const internalSecretHeader = req.headers.get('x-internal-secret') || '';

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let authorized = false;

    // 1. Internal secret check (used by DB triggers via pg_net)
    if (internalSecretHeader) {
      const { data: secretRow } = await adminClient
        .from('app_secrets')
        .select('value')
        .eq('key', 'push_internal_secret')
        .maybeSingle();
      if (secretRow?.value && secretRow.value === internalSecretHeader) {
        authorized = true;
      }
    }

    // 2. Admin JWT fallback (for in-app admin broadcast tool)
    if (!authorized) {
      const authHeader = req.headers.get('Authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData } = await adminClient.auth.getUser(token);
        const callerId = userData?.user?.id;
        if (callerId) {
          const { data: isAdmin } = await adminClient.rpc('is_user_admin', { _user_id: callerId });
          if (isAdmin === true) authorized = true;
        }
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, title, body, url } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = (Deno.env.get('VAPID_PUBLIC_KEY') || '').replace(/^"|"$/g, '').trim();
    const vapidPrivateKey = (Deno.env.get('VAPID_PRIVATE_KEY') || '').replace(/^"|"$/g, '').trim();

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(
      'mailto:admin@bcsocial.org',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = adminClient;

    // Get all push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      console.error('[Push] Error fetching subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count actual unread messages for this user
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user_id)
      .eq('read', false);

    // Count actual unread notifications for this user
    const { count: unreadNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_read', false);

    const totalBadge = (unreadMessages || 0) + (unreadNotifications || 0);

    const payload = JSON.stringify({
      title: title || 'Нове повідомлення',
      body: body || '',
      url: url || '/messages',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      badgeCount: totalBadge,
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        console.error(`[Push] Failed to send to ${sub.endpoint}:`, err.statusCode, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          errors.push(`Removed expired subscription ${sub.id}`);
        } else {
          errors.push(`Failed: ${err.statusCode} ${err.message}`);
        }
      }
    }

    console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications to user ${user_id}, badge: ${totalBadge}`);

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, badge: totalBadge, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Push] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
