-- 최근 배송 요청 20건과 상태. 고객 수정·견적서 발행 여부를 함께 본다.
select r.id                                        as 요청번호,
       r.created_at::date                          as 신청일,
       r.customer_name                             as 신청인,
       r.status                                    as 상태,
       r.edit_count                                as 고객수정,
       case when r.payload_before_edit is not null then '확인 필요' else '' end as 수정확인,
       case when r.quote_issued_at is not null then '발행됨' else '' end as 견적서,
       (select count(*) from request_revisions v where v.request_id = r.id) as 저장된_버전
from requests r
where r.type = 'delivery'
order by r.created_at desc
limit 20;

-- 특정 요청의 버전별 내용: 아래 주석을 풀고 요청번호를 넣어 실행한다.
-- select version, created_at, payload from request_revisions where request_id = 'req-…' order by version;
