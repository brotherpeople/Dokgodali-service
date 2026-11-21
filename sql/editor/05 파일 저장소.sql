-- Storage 버킷과 파일 수. item-images = 배송 신청서 물품 사진(공개 링크, 고객은 올리기만 가능).
select b.id                                        as 버킷,
       case when b.public then '공개' else '비공개' end as 공개,
       pg_size_pretty(b.file_size_limit::bigint)   as 파일당_최대,
       b.allowed_mime_types                        as 허용_형식,
       (select count(*) from storage.objects o where o.bucket_id = b.id) as 파일_수
from storage.buckets b
order by b.id;
