-- supabase/migrations/031_create_adk_sessions_table.sql

-- Create the table to store ADK session data
CREATE TABLE adk_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE adk_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own sessions
CREATE POLICY "Allow users to manage their own sessions"
ON adk_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_adk_sessions_updated
BEFORE UPDATE ON adk_sessions
FOR EACH ROW
EXECUTE PROCEDURE handle_updated_at();
