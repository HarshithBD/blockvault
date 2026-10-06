-- ==============================================================================
-- PHASE 8 SECURITY POLICIES (DOWNLOAD LIMITS)
-- ==============================================================================

-- Create a secure RPC to let authorized users get the true download count for a share
CREATE OR REPLACE FUNCTION public.get_share_download_count(target_share_id UUID)
RETURNS INTEGER 
SET search_path = public
SECURITY DEFINER 
AS $$
  SELECT count(*)::integer FROM public.download_logs WHERE share_id = target_share_id AND status = 'success';
$$ LANGUAGE sql;
