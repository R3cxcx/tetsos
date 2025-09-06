-- Add match_status column to raw_attendance_data table
-- This allows tracking of employee matching status: matched, unmatched, rejected

-- Add the match_status column with enum-like constraint
ALTER TABLE public.raw_attendance_data 
ADD COLUMN match_status TEXT NOT NULL DEFAULT 'unmatched'
CHECK (match_status IN ('matched', 'unmatched', 'rejected'));

-- Add index for better query performance on match_status
CREATE INDEX IF NOT EXISTS idx_raw_attendance_match_status 
ON public.raw_attendance_data(match_status);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_raw_attendance_processed_match_status 
ON public.raw_attendance_data(processed, match_status);

-- Update existing records to have 'matched' status if they were processed
-- and 'unmatched' if they weren't
UPDATE public.raw_attendance_data 
SET match_status = CASE 
    WHEN processed = true THEN 'matched'
    ELSE 'unmatched'
END;
