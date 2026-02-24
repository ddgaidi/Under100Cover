-- =============================================
-- UNDER100COVER - Supabase Database Schema
-- =============================================
-- Run this in Supabase SQL Editor


-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  avatar_emoji TEXT DEFAULT '🦊',
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile is created by the app, not auto-trigger
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GAMES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'voting', 'finished')),
  max_players INTEGER DEFAULT 8 CHECK (max_players BETWEEN 3 AND 12),
  rounds_before_vote INTEGER DEFAULT 2 CHECK (rounds_before_vote BETWEEN 1 AND 5),
  undercover_count INTEGER DEFAULT 1 CHECK (undercover_count >= 1),
  mister_white_count INTEGER DEFAULT 0 CHECK (mister_white_count >= 0),
  current_round INTEGER DEFAULT 0,
  current_turn_index INTEGER DEFAULT 0,
  turn_started_at TIMESTAMPTZ DEFAULT NOW(),
  turn_order TEXT[] DEFAULT '{}',
  civilian_word TEXT,
  undercover_word TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by participants" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = host_id);

CREATE POLICY "Host can update game" ON public.games
  FOR UPDATE USING (auth.uid() = host_id);

-- =============================================
-- GAME PLAYERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  role TEXT CHECK (role IN ('civilian', 'undercover', 'mister_white')),
  word TEXT,
  description TEXT,
  is_eliminated BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view all players in game" ON public.game_players
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join games" ON public.game_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update player roles" ON public.game_players
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT host_id FROM public.games WHERE id = game_id)
  );

-- =============================================
-- REALTIME
-- =============================================
-- Enable realtime for these tables in Supabase dashboard:
-- games, game_players

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS games_code_idx ON public.games(code);
CREATE INDEX IF NOT EXISTS games_status_idx ON public.games(status);
CREATE INDEX IF NOT EXISTS game_players_game_id_idx ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS game_players_user_id_idx ON public.game_players(user_id);

-- =============================================
-- UPDATED_AT trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
