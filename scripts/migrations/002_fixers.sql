-- Migration: Create fixer tables
-- Run: psql $DATABASE_URL -f scripts/migrations/002_fixers.sql

-- Fixers table
CREATE TABLE IF NOT EXISTS fixers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    photo_url TEXT,
    skills TEXT,
    availability TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fixer event RSVPs (event_id is UUID)
CREATE TABLE IF NOT EXISTS fixer_event_rsvps (
    id SERIAL PRIMARY KEY,
    fixer_id INTEGER REFERENCES fixers(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    response VARCHAR(20) CHECK (response IN ('yes', 'no', 'maybe')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fixer_id, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fixers_email ON fixers(email);
CREATE INDEX IF NOT EXISTS idx_fixer_event_rsvps_fixer ON fixer_event_rsvps(fixer_id);
CREATE INDEX IF NOT EXISTS idx_fixer_event_rsvps_event ON fixer_event_rsvps(event_id);
