import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Sends a push notification to a callee about an incoming WebRTC call.
 * Requires the caller to be authenticated. Caller cannot push to a user who
 * has blocked them (via user_blocks).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate caller via JWT
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await adminClient.auth.getUser(token);
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      to_user_id,
      call_id,
      from_name,
      from_avatar,
      conversation_id,
    } = body || {};

    if (!to_user_id || !call_id) {
      return new Response(
        JSON.stringify({ error: 'to_user_id and call_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (to_user_id === callerId) {
      return new Response(
        JSON.stringify({ error: 'Cannot call yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block check (best-effort — table may or may not exist; ignore failures)
    try {
      const { data: blocked } = await adminClient
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', to_user_id)
        .eq('blocked_id', callerId)
        .maybeSingle();
      if (blocked) {
        return new Response(
          JSON.stringify({ sent: 0, reason: 'Blocked by recipient' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch { /* table may not exist — ignore */ }

    const vapidPublicKey = (Deno.env.get('VAPID_PUBLIC_KEY') || '').replace(/^"|"$/g, '').trim();
    const vapidPrivateKey = (Deno.env.get('VAPID_PRIVATE_KEY') || '').replace(/^"|"$/g, '').trim();

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Call Push] VAPID keys not configured');
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

    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', to_user_id);

    if (error) {
      console.error('[Call Push] Error fetching subscriptions:', error);
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

    const callerName = (typeof from_name === 'string' && from_name.trim()) ? from_name.trim() : 'Користувач';
    const url = `/messages?incoming_call=${encodeURIComponent(call_id)}&from=${encodeURIComponent(callerId)}`;

    const payload = JSON.stringify({
      type: 'incoming_call',
      title: '📞 Вхідний дзвінок',
      body: `${callerName} вам телефонує`,
      url,
      icon: from_avatar || '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: `call:${call_id}`,
      requireInteraction: true,
      call: {
        callId: call_id,
        fromUserId: callerId,
        fromName: callerName,
        fromAvatar: from_avatar || '',
        conversationId: conversation_id || null,
      },
      actions: [
        { action: 'accept_call', title: '📞 Прийняти' },
        { action: 'decline_call', title: '📵 Відхилити' },
      ],
    });

    // TTL=30s — call notifications shouldn't be delivered late
    const sendOptions = { TTL: 30, urgency: 'high' as const };

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          sendOptions,
        );
        sent++;
      } catch (err: any) {
        console.error(`[Call Push] Failed to send to ${sub.endpoint}:`, err.statusCode, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
          errors.push(`Removed expired subscription ${sub.id}`);
        } else {
          errors.push(`Failed: ${err.statusCode} ${err.message}`);
        }
      }
    }

    console.log(`[Call Push] Sent ${sent}/${subscriptions.length} call notifications to ${to_user_id}`);

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Call Push] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});