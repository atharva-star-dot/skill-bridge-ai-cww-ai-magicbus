PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  full_name TEXT,
  target_role TEXT,
  current_skills TEXT NOT NULL DEFAULT '[]',
  readiness_score INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS target_roles (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT NOT NULL,
  good_to_have_skills TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_gap_reports (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_role TEXT NOT NULL,
  skills_hash TEXT,
  readiness_score INTEGER NOT NULL,
  matched_skills TEXT NOT NULL,
  missing_skills TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS skill_gap_reports_user_id_idx
  ON skill_gap_reports (user_id);
CREATE INDEX IF NOT EXISTS skill_gap_reports_user_role_idx
  ON skill_gap_reports (user_id, target_role);

CREATE TABLE IF NOT EXISTS learning_plans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_role TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS learning_plans_user_id_idx
  ON learning_plans (user_id);
CREATE INDEX IF NOT EXISTS learning_plans_user_role_idx
  ON learning_plans (user_id, target_role);

CREATE TABLE IF NOT EXISTS plan_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_hours REAL NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  resources TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (plan_id) REFERENCES learning_plans (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS plan_tasks_plan_week_idx
  ON plan_tasks (plan_id, week_number);

CREATE TABLE IF NOT EXISTS resume_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_role TEXT NOT NULL,
  resume_text TEXT,
  ats_score INTEGER NOT NULL,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  missing_keywords TEXT NOT NULL,
  bullet_rewrites TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS resume_reviews_user_id_idx
  ON resume_reviews (user_id);
CREATE INDEX IF NOT EXISTS resume_reviews_user_role_idx
  ON resume_reviews (user_id, target_role);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS interview_sessions_user_id_idx
  ON interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS interview_sessions_user_role_idx
  ON interview_sessions (user_id, target_role);

CREATE TABLE IF NOT EXISTS interview_answers (
  id TEXT PRIMARY KEY NOT NULL,
  interview_session_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT,
  score INTEGER,
  feedback TEXT,
  sample_answer TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_session_id)
    REFERENCES interview_sessions (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS interview_answers_session_question_idx
  ON interview_answers (interview_session_id, question_index);

CREATE TABLE IF NOT EXISTS job_roles (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  salary_range TEXT NOT NULL,
  skills TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
