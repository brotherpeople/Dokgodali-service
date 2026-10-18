// 배포 위치에 따라 연결할 Supabase 프로젝트를 고른다. 코드는 하나, DB는 두 개.
//   - Netlify(main 브랜치) / dokgodali.de  -> 실사용 DB (클라이언트가 관리자)
//   - 그 외 (github.io 테스트 사이트(dev 브랜치), 로컬)  -> 테스트 DB
// anon key와 VAPID 공개키는 원래 브라우저에 공개되는 값이라 여기 둬도 된다.
// (service_role 키, VAPID 개인키, 웹훅 비밀값은 각 프로젝트의 Edge Function Secrets에만 있다.)
(function () {
  const host = location.hostname;
  const isProd = host === 'dokgodali-demo.netlify.app' || host === 'dokgodali.de' || host.endsWith('.dokgodali.de');
  window.DOKGODALI_ENV = isProd
    ? {
        name: 'prod',
        supabaseUrl: 'https://aahmugqchglqqavvotjm.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaG11Z3FjaGdscXFhdnZvdGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjI2NTQsImV4cCI6MjEwNzg5ODY1NH0.2zaMFKwf9L36oRMuABeYJai4nVczbiPeY9dibGeGiy0',
        vapidPublicKey: 'BNzbI-1yJdx1SwPs2Yts8Jv2U1GMkzL09OXK7i1JHJkfUGr4k4AOxzQ1P7fMLCUXewGQw_AAwlAN2QKm4KopUL0',
      }
    : {
        name: 'test',
        supabaseUrl: 'https://wxfqakwnbqapatclybiz.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnFha3duYnFhcGF0Y2x5Yml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTQ5NjQsImV4cCI6MjEwMzMzMDk2NH0._YGTlvj8y2gkIMdrzArKXbwAer1ZMwQCgRN1vz7wiPc',
        vapidPublicKey: 'BBvwdQ0_KBeuWuU17WyzcNyG2hiqlhgIz6aCfXaXNcUOcguxRH4BIL36IuKFU9SfXvEG_cC_YF7REG1KL8hdAXI',
      };
})();
