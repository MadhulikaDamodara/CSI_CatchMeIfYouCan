-- init.sql: create instances table
CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  difficulty INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- sessions table for server-side anti-cheat and persistent timers
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  team_id TEXT,
  team_ref INTEGER,
  token TEXT NOT NULL,
  total_seconds INTEGER NOT NULL,
  remaining_seconds INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_time_seconds INTEGER,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE | COMPLETED | EXPIRED
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL,
  focus_lost_count INTEGER DEFAULT 0,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- per-session lock states
CREATE TABLE IF NOT EXISTS session_states (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  lock_index INTEGER NOT NULL,
  lock_type TEXT NOT NULL,
  state TEXT NOT NULL,
  answer JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (session_id, lock_index)
);

-- Teams table for pre-registered teams
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_name TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  has_played BOOLEAN DEFAULT FALSE
);

-- Question bank table
CREATE TABLE IF NOT EXISTS question_bank (
  id SERIAL PRIMARY KEY,
  round_type TEXT,
  difficulty INTEGER,
  question TEXT,
  options JSONB,
  correct_answer TEXT
);

-- Per-session per-round tracking (3 questions per round expected)
CREATE TABLE IF NOT EXISTS session_rounds (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  questions_answered INT DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE
);
