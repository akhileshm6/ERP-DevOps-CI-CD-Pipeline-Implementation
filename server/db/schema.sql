-- Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  image_tag VARCHAR(100) NOT NULL,
  commit_sha VARCHAR(40) NOT NULL,
  environment VARCHAR(20) NOT NULL DEFAULT 'staging',
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress', 'rolled_back')),
  triggered_by VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('automated', 'manual')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  test_summary JSONB
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target VARCHAR(100) NOT NULL,
  from_state JSONB,
  to_state JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);