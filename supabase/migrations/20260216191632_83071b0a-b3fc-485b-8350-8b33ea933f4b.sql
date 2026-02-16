
-- Cache for extracted video URLs
CREATE TABLE public.video_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  content_type TEXT NOT NULL, -- movie, series, dorama, anime
  audio_type TEXT NOT NULL DEFAULT 'legendado',
  season INTEGER,
  episode INTEGER,
  video_url TEXT NOT NULL,
  video_type TEXT NOT NULL DEFAULT 'm3u8', -- m3u8 or mp4
  provider TEXT NOT NULL DEFAULT 'vidsrc',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tmdb_id, content_type, audio_type, season, episode)
);

-- Enable RLS
ALTER TABLE public.video_cache ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can watch)
CREATE POLICY "Anyone can read video cache" ON public.video_cache FOR SELECT USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admins can manage video cache" ON public.video_cache FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Index for fast lookups
CREATE INDEX idx_video_cache_lookup ON public.video_cache (tmdb_id, content_type, audio_type, season, episode);
CREATE INDEX idx_video_cache_expiry ON public.video_cache (expires_at);
