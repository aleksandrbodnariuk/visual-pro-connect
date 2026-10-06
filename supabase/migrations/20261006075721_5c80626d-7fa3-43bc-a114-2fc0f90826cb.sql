DELETE FROM net._http_response WHERE created < now() - interval '1 day';
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days' OR (end_time IS NULL AND start_time < now() - interval '2 days');
DELETE FROM public.analytics_events WHERE occurred_at < now() - interval '180 days';

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('cleanup-net-responses','cleanup-cron-history');
SELECT cron.schedule('cleanup-net-responses', '15 * * * *', $$DELETE FROM net._http_response WHERE created < now() - interval '6 hours'$$);
SELECT cron.schedule('cleanup-cron-history', '30 3 * * *', $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days'$$);