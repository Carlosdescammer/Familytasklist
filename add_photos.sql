-- Add photo_url to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  caption TEXT,
  description TEXT,
  tags TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
