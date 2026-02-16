
-- Add audio_type column for tracking dub/sub/cam
ALTER TABLE public.content ADD COLUMN audio_type TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.content.audio_type IS 'Array of audio types: dublado, legendado, cam';
