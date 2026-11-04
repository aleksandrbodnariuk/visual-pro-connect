CREATE TABLE public.ai_assistant_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  assistant_name text NOT NULL DEFAULT 'Помічник B&C studio',
  greeting text NOT NULL DEFAULT 'Вітаю! Я помічник B&C studio. Допоможу обрати фото, відео чи музичну послугу або підкажу, як користуватися платформою.',
  knowledge_base text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT 'Відповідай українською, коротко й доброзичливо. Усі фахівці — єдина команда B&C studio.',
  quick_questions text NOT NULL DEFAULT E'Як замовити фотосесію?\nСкільки коштує відеозйомка весілля?\nЯк замовити пісню-привітання?\nЯк додати друга?\nЯк написати повідомлення?',
  studio_url text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_assistant_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.ai_assistant_settings TO authenticated;
GRANT ALL ON public.ai_assistant_settings TO service_role;
ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai settings readable" ON public.ai_assistant_settings FOR SELECT USING (true);
CREATE POLICY "ai settings admin update" ON public.ai_assistant_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "ai settings admin insert" ON public.ai_assistant_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.ai_assistant_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.ai_assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  guest_token text,
  source text NOT NULL DEFAULT 'support',
  status text NOT NULL DEFAULT 'unread',
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_count integer NOT NULL DEFAULT 0,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  credits_used numeric NOT NULL DEFAULT 0,
  duration_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conv_status_idx ON public.ai_assistant_conversations (status, updated_at DESC);
CREATE INDEX ai_conv_user_idx ON public.ai_assistant_conversations (user_id, updated_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.ai_assistant_conversations TO authenticated;
GRANT ALL ON public.ai_assistant_conversations TO service_role;
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai conv own or admin read" ON public.ai_assistant_conversations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ai conv admin update" ON public.ai_assistant_conversations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()) AND status IN ('unread','read','in_progress','archived'));
CREATE POLICY "ai conv admin delete" ON public.ai_assistant_conversations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));