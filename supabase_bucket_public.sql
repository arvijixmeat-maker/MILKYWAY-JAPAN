-- storage.buckets 테이블을 수정하여 'images' 버킷을 강제로 'public' 상태로 만듭니다.
-- RLS 정책(이전 단계)과 별개로, 버킷 자체가 Public이어야 getPublicUrl로 생성된 주소가 외부에서 접속 가능합니다.

UPDATE storage.buckets
SET public = true
WHERE id = 'images';

-- 혹시 모르니 확인을 위해 avatars 등 다른 버킷도 필요하다면 추가할 수 있습니다.
-- UPDATE storage.buckets SET public = true WHERE id = 'avatars';
