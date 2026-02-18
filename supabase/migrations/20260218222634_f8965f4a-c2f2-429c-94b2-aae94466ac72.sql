
-- Table to log every video resolution attempt in real-time
CREATE TABLE public.resolve_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id integer NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL,
  season integer,
  episode integer,
  provider text,
  video_url text,
  video_type text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast querying
CREATE INDEX idx_resolve_logs_created_at ON public.resolve_logs (created_at DESC);
CREATE INDEX idx_resolve_logs_tmdb_id ON public.resolve_logs (tmdb_id);

-- Enable RLS
ALTER TABLE public.resolve_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can read logs (admin UI uses this)
CREATE POLICY "Anyone can read resolve logs"
ON public.resolve_logs FOR SELECT
USING (true);

-- Service role inserts (from edge functions)
CREATE POLICY "Service can insert logs"
ON public.resolve_logs FOR INSERT
WITH CHECK (true);

-- Admins can delete logs
CREATE POLICY "Admins can delete logs"
ON public.resolve_logs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.resolve_logs;
