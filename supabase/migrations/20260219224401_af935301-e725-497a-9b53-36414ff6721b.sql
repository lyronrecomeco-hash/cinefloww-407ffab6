
-- =====================================================
-- WATCH TOGETHER - Tabelas, RLS, Triggers, Realtime
-- =====================================================

-- 1. Tabela principal: salas
CREATE TABLE public.watch_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  room_code text NOT NULL UNIQUE,
  tmdb_id integer NOT NULL,
  content_type text NOT NULL DEFAULT 'movie',
  season integer,
  episode integer,
  title text NOT NULL DEFAULT '',
  poster_path text,
  status text NOT NULL DEFAULT 'waiting',
  max_participants integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours')
);

-- 2. Tabela de participantes
CREATE TABLE public.watch_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, profile_id)
);

-- 3. Tabela de mensagens do chat
CREATE TABLE public.watch_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_watch_rooms_code ON public.watch_rooms(room_code);
CREATE INDEX idx_watch_rooms_host ON public.watch_rooms(host_profile_id);
CREATE INDEX idx_watch_rooms_status ON public.watch_rooms(status) WHERE status != 'closed';
CREATE INDEX idx_watch_room_participants_room ON public.watch_room_participants(room_id);
CREATE INDEX idx_watch_room_participants_profile ON public.watch_room_participants(profile_id);
CREATE INDEX idx_watch_room_messages_room ON public.watch_room_messages(room_id);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.watch_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_room_messages ENABLE ROW LEVEL SECURITY;

-- watch_rooms: Authenticated users can create rooms linked to their own profile
CREATE POLICY "Users create own rooms"
  ON public.watch_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_rooms.host_profile_id AND up.user_id = auth.uid())
  );

-- watch_rooms: Anyone authenticated can find open rooms (for joining by code)
CREATE POLICY "Authenticated can read open rooms"
  ON public.watch_rooms FOR SELECT
  TO authenticated
  USING (true);

-- watch_rooms: Only host can update room
CREATE POLICY "Host can update room"
  ON public.watch_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_rooms.host_profile_id AND up.user_id = auth.uid())
  );

-- watch_rooms: Only host can delete room
CREATE POLICY "Host can delete room"
  ON public.watch_rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_rooms.host_profile_id AND up.user_id = auth.uid())
  );

-- watch_room_participants: Users can join rooms (insert themselves)
CREATE POLICY "Users can join rooms"
  ON public.watch_room_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_room_participants.profile_id AND up.user_id = auth.uid())
  );

-- watch_room_participants: Can read participants of rooms you're in
CREATE POLICY "Read room participants"
  ON public.watch_room_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.watch_room_participants wrp2 
            JOIN public.user_profiles up ON up.id = wrp2.profile_id 
            WHERE wrp2.room_id = watch_room_participants.room_id AND up.user_id = auth.uid())
  );

-- watch_room_participants: Users can update own heartbeat
CREATE POLICY "Update own participant"
  ON public.watch_room_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_room_participants.profile_id AND up.user_id = auth.uid())
  );

-- watch_room_participants: Users can leave (delete themselves) or host can kick
CREATE POLICY "Users can leave rooms"
  ON public.watch_room_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = watch_room_participants.profile_id AND up.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.watch_rooms wr 
               JOIN public.user_profiles up ON up.id = wr.host_profile_id 
               WHERE wr.id = watch_room_participants.room_id AND up.user_id = auth.uid())
  );

-- watch_room_messages: Participants can send messages
CREATE POLICY "Participants can send messages"
  ON public.watch_room_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.watch_room_participants wrp 
            JOIN public.user_profiles up ON up.id = wrp.profile_id 
            WHERE wrp.room_id = watch_room_messages.room_id AND up.user_id = auth.uid())
  );

-- watch_room_messages: Participants can read messages
CREATE POLICY "Participants can read messages"
  ON public.watch_room_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.watch_room_participants wrp 
            JOIN public.user_profiles up ON up.id = wrp.profile_id 
            WHERE wrp.room_id = watch_room_messages.room_id AND up.user_id = auth.uid())
  );

-- Admin full access
CREATE POLICY "Admins manage watch rooms"
  ON public.watch_rooms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage participants"
  ON public.watch_room_participants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage messages"
  ON public.watch_room_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto update updated_at
CREATE TRIGGER update_watch_rooms_updated_at
  BEFORE UPDATE ON public.watch_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Limit 1 active room per host
CREATE OR REPLACE FUNCTION public.check_one_room_per_host()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.watch_rooms 
    WHERE host_profile_id = NEW.host_profile_id 
    AND status != 'closed'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Você já possui uma sala ativa. Feche a atual antes de criar outra.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_one_room_per_host
  BEFORE INSERT ON public.watch_rooms
  FOR EACH ROW EXECUTE FUNCTION public.check_one_room_per_host();

-- Limit max participants per room
CREATE OR REPLACE FUNCTION public.check_max_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
BEGIN
  SELECT wr.max_participants INTO max_allowed FROM public.watch_rooms wr WHERE wr.id = NEW.room_id;
  SELECT COUNT(*) INTO current_count FROM public.watch_room_participants wrp WHERE wrp.room_id = NEW.room_id;
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Sala cheia! Máximo de % participantes.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_participants
  BEFORE INSERT ON public.watch_room_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_max_participants();

-- Generate room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    LOOP
      new_code := 'ROOM-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      SELECT EXISTS(SELECT 1 FROM public.watch_rooms wr WHERE wr.room_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.room_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_room_code
  BEFORE INSERT ON public.watch_rooms
  FOR EACH ROW EXECUTE FUNCTION public.generate_room_code();

-- Rate limit chat messages (max 1 per second per profile)
CREATE OR REPLACE FUNCTION public.rate_limit_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.watch_room_messages wm
    WHERE wm.profile_id = NEW.profile_id
    AND wm.room_id = NEW.room_id
    AND wm.created_at > now() - interval '1 second'
  ) THEN
    RAISE EXCEPTION 'Aguarde antes de enviar outra mensagem.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_chat_rate_limit
  BEFORE INSERT ON public.watch_room_messages
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_chat();

-- =====================================================
-- REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_room_messages;
