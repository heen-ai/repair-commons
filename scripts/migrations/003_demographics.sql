-- Migration: Add registration_demographics table
-- Created: 2026-02-27

-- Table for storing demographic data from registrations (optional)
CREATE TABLE IF NOT EXISTS registration_demographics (
  id SERIAL PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  fixer_id INTEGER REFERENCES fixers(id) ON DELETE CASCADE,
  
  -- Demographics (all optional)
  age_group VARCHAR(50),
  gender VARCHAR(100),
  gender_self_describe TEXT,
  newcomer_to_canada VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_registration_demographics_registration 
ON registration_demographics(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_demographics_fixer 
ON registration_demographics(fixer_id);

-- Add approved_at column to fixers table (for approval workflow)
ALTER TABLE fixers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE fixers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add index for approved fixers
CREATE INDEX IF NOT EXISTS idx_fixers_status ON fixers(status);
