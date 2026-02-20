-- 이미지가 저장된 'images' 버킷에 대해 누구나 읽을 수 있도록(public) 권한을 설정합니다.
-- 이는 외부 이미지 최적화 도구(wsrv.nl)나 사용자가 이미지를 볼 수 있게 하기 위함입니다.

-- 1. storage.objects 테이블에서 'images' 버킷에 대한 기존 Read 정책이 있다면 삭제 (충돌 방지)
-- (정책 이름은 프로젝트마다 다를 수 있으니, 만약 에러가 난다면 무시하고 넘어도 됩니다)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to images" ON storage.objects;

-- 2. images 버킷에 대한 Public Read(누구나 읽기 가능) 정책 생성
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 참고: 만약 'images'라는 버킷이 Public으로 설정되어 있지 않다면 수파베이스 대시보드에서 
-- Storage -> Buckets -> images -> 'Public' 토글을 켜는 것이 가장 확실한 방법일 수 있습니다.
-- 위 SQL은 RLS(Row Level Security) 정책을 통해 이를 허용하는 명령어입니다.
