# 독고달이 (Dokgodali)

**Language:** [English](README.md) | 한국어

독일 고속도로를 달리는 이사 도우미 — 이사 견적부터 크루 스케줄 관리까지 이어지는 서비스 프로토타입입니다.

## 1. 견적서 예약 플로우

부피 계산 → 경로·옵션 입력 → 고객 정보 및 공식 견적서(PDF) 발급까지 이어지는 고객용 플로우입니다.

**[한국어로 테스트해 볼 수 있습니다 →](https://brotherpeople.github.io/Dokgodali-service/dokgodali-quote-flow.html)**
**[English version →](https://brotherpeople.github.io/Dokgodali-service/dokgodali-quote-flow-en.html)**

## 2. 크루 스케줄 관리

관리자가 견적 완료된 작업을 등록하고 크루를 배정하면, 크루는 자신의 오늘 일정과 가능 여부를 확인하는 관리용 대시보드입니다.

**[한국어로 테스트해 볼 수 있습니다 →](https://brotherpeople.github.io/Dokgodali-service/dokgodali-schedule.html)**
**[English version →](https://brotherpeople.github.io/Dokgodali-service/dokgodali-schedule-en.html)**

## 3. 실제 서비스로 배포하기 전 고려할 점

현재 두 프로토타입은 **서로 연동되어 있지 않습니다.** 견적서 플로우는 완전히 클라이언트 사이드로 동작해서 고객이 견적서를 작성하고 PDF를 다운로드해도 그 내용이 어디에도 저장되지 않고, 스케줄 관리 대시보드의 Supabase DB는 관리자가 직접 "스케줄 등록" 화면에서 수동으로 입력해야만 채워집니다. 실제 서비스로 전환하려면 최소한 아래 사항들을 검토해야 합니다.

1. **두 시스템 연결 방식 설계** — 고객이 견적서를 제출하면 바로 스케줄 DB에 저장할지, 계약금 결제 확인 후 관리자 승인을 거쳐 스케줄로 전환할지 결정이 필요합니다. 노쇼·이중예약 리스크를 고려하면 "견적 제출 → `quotes` 테이블 저장 → 계약금 결제 확인 → 관리자 승인 후 스케줄 전환" 흐름을 권장합니다.
2. **인증/권한(RLS)** — 지금은 관리자/크루 전환이 로그인 없는 버튼 클릭입니다. 실제로는 크루별 계정과 Supabase RLS(Row Level Security) 정책으로 "본인 배정만 수정 가능", "관리자만 스케줄 생성 가능" 같은 규칙을 서버 단에서 강제해야 합니다. 현재는 anon key가 그대로 노출되어 있어 이론상 누구나 전체 데이터를 읽고 쓸 수 있습니다.
3. **결제 연동** — 견적서 조건에 명시된 계약금(Anzahlung) 20% 선입금을 실제로 받을 결제 수단(Stripe, PayPal, SEPA 이체 확인 등)이 아직 없습니다.
4. **법적/세무 검토** — 견적서에 들어간 §650 BGB·§451g HGB·§312g BGB 관련 문구는 데모용 예시이며, 실제 발송 전 독일 변호사·세무사 검토가 필요합니다. 정식 세금계산서로 전환 시 독일 UStG상 필수 기재사항 준수, 웹사이트 자체의 Impressum(사업자 정보 고지) 게재도 필요합니다.
5. **개인정보 보호(DSGVO/GDPR)** — 고객 이름·연락처·주소를 수집하므로 개인정보처리방침, 보관 기간, 삭제 절차를 마련해야 합니다.
6. **운영 로직 보강** — 같은 크루나 같은 차량이 같은 날 여러 일정에 중복 배정되는 것을 막는 충돌 체크가 없습니다. WhatsApp 알림도 관리자가 버튼을 눌러 수동으로 발송하는 방식이라, 자동 알림(WhatsApp Business API, SMS 등) 도입을 고려할 수 있습니다.
7. **인프라** — GitHub Pages는 프로토타입 단계에는 충분하지만, 결제·개인정보를 다루기 시작하면 커스텀 도메인+HTTPS, 운영/스테이징 Supabase 프로젝트 분리, 백업 정책을 갖추는 것을 권장합니다.
