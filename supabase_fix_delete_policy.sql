-- RLS 활성화 확인
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 1. Quotes 테이블: 관리자('admin')만 삭제 가능하도록 정책 설정
-- 기존 정책 제거 (충돌 방지)
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON quotes;
DROP POLICY IF EXISTS "Enable delete for admins only" ON quotes;

-- 새 정책 생성: profiles 테이블의 role이 'admin'인 사용자만 삭제 가능
CREATE POLICY "Enable delete for admins only" ON quotes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 2. Reservations 테이블: 관리자('admin')만 삭제 가능하도록 정책 설정 
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable delete for admins only" ON reservations;

CREATE POLICY "Enable delete for admins only" ON reservations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 참고: profiles 테이블에 대한 읽기 권한이 있어야 위 정책이 작동합니다.
-- 보통 profiles는 본인 것은 읽을 수 있으므로 작동하지만, 만약 막혀있다면 아래 정책도 확인 필요합니다.
-- (대부분의 경우 이미 설정되어 있으므로 생략 가능하나, 문제 발생 시 실행)
-- CREATE POLICY "Allow users to read their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
