
-- Tabela para ingestão do bot Telegram
CREATE TABLE public.telegram_ingestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  synopsis text,
  content_type text NOT NULL DEFAULT 'movie',
  season integer,
  episode integer,
  episode_title text,
  telegram_file_id text NOT NULL,
  telegram_unique_id text NOT NULL UNIQUE,
  file_size bigint,
  duration integer,
  resolution text,
  file_name text,
  mime_type text,
  status text NOT NULL DEFAULT 'pending',
  telegram_user_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_ingestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage telegram ingestions"
ON public.telegram_ingestions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role inserts (from edge function)
CREATE POLICY "Service can insert ingestions"
ON public.telegram_ingestions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can select ingestions"
ON public.telegram_ingestions FOR SELECT
USING (true);

CREATE TRIGGER update_telegram_ingestions_updated_at
BEFORE UPDATE ON public.telegram_ingestions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_ingestions;
