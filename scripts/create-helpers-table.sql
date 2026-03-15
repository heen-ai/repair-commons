-- Create helpers table for volunteer registrations
CREATE TABLE IF NOT EXISTS helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  availability TEXT,
  comments TEXT,
  has_volunteered_before BOOLEAN DEFAULT false,
  roles TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_helpers_email ON helpers(email);

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_helpers_status ON helpers(status);
