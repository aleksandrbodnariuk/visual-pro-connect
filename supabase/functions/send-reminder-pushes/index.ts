import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find active reminders that are due (remind_at <= now) and haven't been notified yet
    const nowIso = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from('vip_reminders')
      .select('id, user_id, title, description, remind_at, push_enabled')
      .eq('status', 'active')
      .is('notified_at', null)
      .lte('remind_at', nowIso)
      .limit(100);

    if (fetchError) {
      console.error('[Reminders] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueReminders?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No due reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Reminders] Found ${dueReminders.length} due reminders`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let pushSent = 0;
    let markedDone = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders) {
      try {
        // Send push if enabled
        if (reminder.push_enabled) {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              user_id: reminder.user_id,
              title: `⏰ ${reminder.title}`,
              body: reminder.description || 'Час нагадування!',
              url: '/vip/reminders',
            }),
          });

          if (pushRes.ok) {
            pushSent++;
          } else {
            const errText = await pushRes.text();
            errors.push(`Reminder ${reminder.id}: push failed (${pushRes.status}) ${errText}`);
          }
        }

        // Always create an in-app notification
        await supabase.from('notifications').insert({
          user_id: reminder.user_id,
          message: `⏰ Нагадування: ${reminder.title}`,
          link: '/vip/reminders',
        });

        // Mark as notified + done
        const { error: updateError } = await supabase
          .from('vip_reminders')
          .update({
            notified_at: new Date().toISOString(),
            status: 'done',
          })
          .eq('id', reminder.id);

        if (updateError) {
          errors.push(`Reminder ${reminder.id}: update failed ${updateError.message}`);
        } else {
          markedDone++;
        }
      } catch (err: any) {
        console.error(`[Reminders] Error processing ${reminder.id}:`, err);
        errors.push(`Reminder ${reminder.id}: ${err.message}`);
      }
    }

    console.log(`[Reminders] Processed: ${dueReminders.length}, push sent: ${pushSent}, marked done: ${markedDone}`);

    return new Response(
      JSON.stringify({
        processed: dueReminders.length,
        push_sent: pushSent,
        marked_done: markedDone,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Reminders] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});