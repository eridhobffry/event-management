ALTER TABLE events
ADD COLUMN IF NOT EXISTS expectations JSONB DEFAULT '[]'::jsonb; 