
-- Таблиця папок користувача
CREATE TABLE public.user_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблиця файлів користувача
CREATE TABLE public.user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id uuid REFERENCES public.user_folders(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'photo',
  title text,
  created_at timestamptz DEFAULT now()
);

-- Увімкнути RLS
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- RLS для папок
CREATE POLICY "Users can view own folders" ON public.user_folders
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own folders" ON public.user_folders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own folders" ON public.user_folders
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own folders" ON public.user_folders
  FOR DELETE USING (user_id = auth.uid());

-- RLS для файлів
CREATE POLICY "Users can view own files" ON public.user_files
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can upload own files" ON public.user_files
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own files" ON public.user_files
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own files" ON public.user_files
  FOR DELETE USING (user_id = auth.uid());

-- Індекси
CREATE INDEX idx_user_folders_user_id ON public.user_folders(user_id);
CREATE INDEX idx_user_files_user_id ON public.user_files(user_id);
CREATE INDEX idx_user_files_folder_id ON public.user_files(folder_id);
