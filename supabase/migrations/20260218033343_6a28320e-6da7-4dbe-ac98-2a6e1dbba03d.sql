
-- 1. Site visitors tracking table
CREATE TABLE public.site_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  ip_hash text,
  referrer text,
  hostname text,
  pathname text,
  user_agent text,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitors" ON public.site_visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read visitors" ON public.site_visitors FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_site_visitors_visited_at ON public.site_visitors (visited_at DESC);
CREATE INDEX idx_site_visitors_visitor_id ON public.site_visitors (visitor_id);
CREATE INDEX idx_site_visitors_hostname ON public.site_visitors (hostname);

-- 2. Video cache backup table (permanent, no expiration)
CREATE TABLE public.video_cache_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  content_type text NOT NULL,
  audio_type text NOT NULL DEFAULT 'legendado',
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'm3u8',
  provider text NOT NULL DEFAULT 'unknown',
  season integer,
  episode integer,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tmdb_id, content_type, audio_type, season, episode)
);

ALTER TABLE public.video_cache_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backups" ON public.video_cache_backup FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read backups" ON public.video_cache_backup FOR SELECT USING (true);

-- 3. Trigger to auto-backup every video_cache insert/update
CREATE OR REPLACE FUNCTION public.backup_video_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.video_cache_backup (tmdb_id, content_type, audio_type, video_url, video_type, provider, season, episode)
  VALUES (NEW.tmdb_id, NEW.content_type, NEW.audio_type, NEW.video_url, NEW.video_type, NEW.provider, NEW.season, NEW.episode)
  ON CONFLICT (tmdb_id, content_type, audio_type, season, episode)
  DO UPDATE SET video_url = EXCLUDED.video_url, video_type = EXCLUDED.video_type, provider = EXCLUDED.provider, backed_up_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_backup_video_cache
AFTER INSERT OR UPDATE ON public.video_cache
FOR EACH ROW
EXECUTE FUNCTION public.backup_video_cache();

-- 4. API access log (for security monitoring)
CREATE TABLE public.api_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  ip_hash text,
  user_agent text,
  blocked boolean NOT NULL DEFAULT false,
  reason text,
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read api logs" ON public.api_access_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for visitors
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_visitors;
