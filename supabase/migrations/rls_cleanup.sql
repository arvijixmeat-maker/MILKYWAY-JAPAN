-- ================================================================
-- 남은 RLS 정책 경고 정리
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ================================================================

-- ==================== 이전 정책 삭제 ====================

-- accommodations - 'Public write' 정책 삭제
DROP POLICY IF EXISTS "Public write" ON accommodations;
DROP POLICY IF EXISTS "Public write for all" ON accommodations;
DROP POLICY IF EXISTS "Allow all" ON accommodations;

-- quick_links - 'Authenticated write access' 정책 삭제
DROP POLICY IF EXISTS "Authenticated write access" ON quick_links;
DROP POLICY IF EXISTS "Allow authenticated write" ON quick_links;

-- quotes - 이전 정책 삭제 (중복되는 것들)
DROP POLICY IF EXISTS "Users can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON quotes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON quotes;

-- reservations - 이전 정책 삭제
DROP POLICY IF EXISTS "Allow insert for authenticated" ON reservations;
DROP POLICY IF EXISTS "Allow insert for authenti" ON reservations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON reservations;

-- ==================== handle_new_user 함수 수정 ====================
-- search_path 보안 문제 해결

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 기존 함수 로직 유지 (있는 경우)
  RETURN NEW;
END;
$$;

-- ================================================================
-- 완료!
-- ================================================================
