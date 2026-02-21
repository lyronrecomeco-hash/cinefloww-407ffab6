
-- Table to track ad clicks for metrics
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  user_email text,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  validated boolean NOT NULL DEFAULT false,
  content_title text,
  tmdb_id integer
);

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ad clicks" ON public.ad_clicks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert ad clicks" ON public.ad_clicks
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_ad_clicks_clicked_at ON public.ad_clicks (clicked_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_clicks;
