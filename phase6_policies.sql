-- ==============================================================================
-- PHASE 6 SECURITY POLICIES (LOGGING)
-- ==============================================================================

-- 1. Download Logs: Allow any authenticated user to insert a log of their own download
CREATE POLICY "Users can insert own download logs" 
ON public.download_logs
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 2. Activity Logs: Allow any authenticated user to insert their own activity
CREATE POLICY "Users can insert own activity logs" 
ON public.activity_logs
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
