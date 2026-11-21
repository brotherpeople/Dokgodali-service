-- 배송 신청 폼의 물품 사진 업로드용 버킷.
-- 사진 URL은 대량등록 엑셀의 "이미지 URL" 칸으로 배송사에 전달되므로 공개 버킷으로 둔다.
-- 파일명은 브라우저가 만든 무작위 UUID라 주소를 추측할 수 없다. (신청 폼 약관 안내 참고)
-- Dokgodali-dev와 Dokgodali-demo 두 프로젝트 모두에서 실행해야 한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 고객(로그인 안 함)은 올리기만 할 수 있다. 덮어쓰기·삭제는 정책이 없으므로 막힌다.
create policy "누구나 물품 사진 업로드" on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'item-images');
