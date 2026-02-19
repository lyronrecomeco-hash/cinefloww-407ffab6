
-- =============================================
-- PHASE 1: User profiles & auth infrastructure
-- =============================================

-- Profiles table (1 per auth user)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  ip_hash text,
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  banned boolean DEFAULT false,
  ban_reason text,
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Deny anon profiles" ON public.profiles AS RESTRICTIVE FOR SELECT TO anon USING (false);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PHASE 2: Multi-profile system (Netflix-style)
-- =============================================

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_index integer DEFAULT 0,
  is_default boolean DEFAULT false,
  share_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profiles" ON public.user_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read profiles by share_code" ON public.user_profiles FOR SELECT USING (share_code IS NOT NULL);
CREATE POLICY "Admins read all user_profiles" ON public.user_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Generate unique share code on profile creation
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'LYNE-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE share_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.share_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_share_code
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_share_code();

-- =============================================
-- PHASE 3: Cloud-synced My List
-- =============================================

CREATE TABLE public.my_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  content_type text NOT NULL,
  title text NOT NULL,
  poster_path text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, tmdb_id, content_type)
);

ALTER TABLE public.my_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own list" ON public.my_list FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.user_profiles up WHERE up.id = profile_id AND up.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.user_profiles up WHERE up.id = profile_id AND up.user_id = auth.uid()));

CREATE POLICY "Read list by share code" ON public.my_list FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.user_profiles up WHERE up.id = profile_id AND up.share_code IS NOT NULL));

-- =============================================
-- PHASE 4: Auth audit log (security)
-- =============================================

CREATE TABLE public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  ip_hash text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs" ON public.auth_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service insert audit logs" ON public.auth_audit_log FOR INSERT WITH CHECK (true);

-- Enable realtime for profiles and audit
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.my_list;
