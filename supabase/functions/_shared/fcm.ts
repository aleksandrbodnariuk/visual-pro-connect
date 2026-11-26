// Native Android/iOS push via Firebase Cloud Messaging (HTTP v1) through the Lovable connector gateway.
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging';

export interface FcmMessage {
  title: string;
  body: string;
  url: string;
  badge: number;
  channelId: 'messages' | 'calls';
  data?: Record<string, string>;
  ttlSeconds?: number;
}

export async function sendFcmToUser(admin: any, userId: string, msg: FcmMessage) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const fcmKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY');
  const { data: tokens } = await admin.from('device_tokens').select('id, token').eq('user_id', userId);
  if (!tokens?.length) return { sent: 0, total: 0, reason: 'no device tokens' };
  if (!lovableKey || !fcmKey) {
    console.error('[FCM] Firebase connection is not linked (FIREBASE_MESSAGING_API_KEY missing)');
    return { sent: 0, total: tokens.length, reason: 'firebase not configured' };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const t of tokens) {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': fcmKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: t.token,
          notification: { title: msg.title, body: msg.body },
          data: { url: msg.url, badge: String(msg.badge), ...(msg.data || {}) },
          android: {
            priority: 'HIGH',
            ttl: `${msg.ttlSeconds ?? 86400}s`,
            notification: {
              channel_id: msg.channelId,
              notification_count: msg.badge, // launcher badge while the app is closed
              default_sound: true,
            },
          },
          apns: { payload: { aps: { badge: msg.badge, sound: 'default' } } },
        },
      }),
    });
    if (res.ok) { sent++; continue; }
    const text = await res.text();
    console.error(`[FCM] send failed [${res.status}]: ${text}`);
    if (res.status === 404 || (res.status === 400 && text.includes('INVALID_ARGUMENT') && text.includes('token'))
        || text.includes('UNREGISTERED')) {
      await admin.from('device_tokens').delete().eq('id', t.id);
    }
    errors.push(`${res.status}`);
  }
  return { sent, total: tokens.length, errors };
}
