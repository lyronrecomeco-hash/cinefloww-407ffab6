
-- Fix: use SECURITY DEFINER function to avoid infinite recursion

-- Create function that checks if user is participant in a room
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.watch_room_participants wrp
    JOIN public.user_profiles up ON up.id = wrp.profile_id
    WHERE wrp.room_id = _room_id AND up.user_id = _user_id
  );
$$;

-- Drop the broken policy
DROP POLICY IF EXISTS "Read room participants" ON public.watch_room_participants;

-- Create clean policy using the function
CREATE POLICY "Read room participants" 
ON public.watch_room_participants 
FOR SELECT 
USING (
  public.is_room_participant(room_id, auth.uid())
);
