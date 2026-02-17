-- Track items that failed resolution to avoid retrying them
CREATE TABLE IF NOT EXISTS public.resolve_failures (
  tmdb_id integer NOT NULL,
  content_type text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (tmdb_id, content_type)
);

-- No RLS needed - only accessed by edge functions with service role key
ALTER TABLE public.resolve_failures ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage resolve_failures" ON public.resolve_failures
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
