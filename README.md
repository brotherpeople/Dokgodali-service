# 독고달이 (Dokgodali)

독일 고속도로를 달리는 이사 도우미 — 이사 견적, 한국행 소형 배송 예약, 크루 스케줄 관리까지 이어지는 서비스입니다.

> **Language:** 한국어 · English version coming soon (영문판은 추후 업로드 예정입니다)

---

## 한눈에 보기

| 기능 | 대상 | 설명 |
|---|---|---|
| 이사 견적 | 고객 | 부피 계산 → 경로·옵션 → 고객 정보 입력 후 공식 견적서(PDF) 발급 |
| 한국행 배송 예약 | 고객 | 박스별 치수·무게·물품 입력 → 접수 방식(픽업/방문) → 개인 정보. 운임 자동 계산 |
| 크루 스케줄 관리 | 관리자·크루 | 신규 요청 확정 → 스케줄 등록·크루 배정 → 크루별 일정·근무시간 기록 |

---

## 투트랙 운영: dev / demo

코드는 하나, 배포와 DB는 두 벌로 나눠 운영합니다. 개발 중인 기능은 **dev**에서 확인하고, 클라이언트 확인이 끝난 기능만 **demo**(main)에 반영합니다.

| | dev (개발·테스트) | demo (클라이언트 시연·실사용) |
|---|---|---|
| Git 브랜치 | `dev` | `main` |
| 배포 | GitHub Pages | Netlify |
| 주소 | brotherpeople.github.io/Dokgodali-service | dokgodali-demo.netlify.app |
| DB | Supabase `Dokgodali-dev` | Supabase `Dokgodali-demo` |
| 데이터 | 테스트 데이터 (자유롭게 입력·삭제) | 실제 고객 요청 (클라이언트가 관리자) |
| 화면 표시 | 상단에 노란 **"개발 중인 테스트 페이지"** 띠 | 표시 없음 |

### 바로 가기

| 기능 | dev | demo |
|---|---|---|
| 이사 견적 | [열기](https://brotherpeople.github.io/Dokgodali-service/dokgodali-quote-flow.html) | [열기](https://dokgodali-demo.netlify.app/dokgodali-quote-flow.html) |
| 배송 예약 | [열기](https://brotherpeople.github.io/Dokgodali-service/dokgodali-delivery.html) | [열기](https://dokgodali-demo.netlify.app/dokgodali-delivery.html) |
| 스케줄 관리 | [열기](https://brotherpeople.github.io/Dokgodali-service/dokgodali-schedule.html) | [열기](https://dokgodali-demo.netlify.app/dokgodali-schedule.html) |

### DB는 어떻게 나뉘나요?

`dokgodali-config.js`가 접속한 주소를 보고 연결할 Supabase 프로젝트를 고릅니다.

- `dokgodali-demo.netlify.app`, `dokgodali.de` → **demo DB**
- 그 외 (github.io, 로컬에서 파일을 직접 연 경우) → **dev DB**

그래서 로컬이나 테스트 사이트에서 무엇을 입력해도 실사용 데이터에는 영향이 없습니다.

### 개발 흐름

```
기능 브랜치 ──▶ dev ──▶ (테스트 사이트에서 확인) ──▶ 클라이언트 확인 ──▶ main
               │                                                    │
               └─ GitHub Pages + dev DB                              └─ Netlify + demo DB
```

1. 기능별 브랜치(예: `feature/delivery-form-revision`)에서 작업하고, 기능 단위로 커밋합니다.
2. `dev`에 반영하면 GitHub Pages에 자동 배포됩니다 (1분 이내).
3. 테스트 사이트에서 확인하고 클라이언트 확인을 받습니다.
4. 확인이 끝난 변경만 `main`에 반영합니다. Netlify가 자동 배포합니다.

---

## 기술 구성

| 영역 | 사용 기술 | 비고 |
|---|---|---|
| 화면 | HTML · CSS · JavaScript | 빌드 과정 없는 정적 페이지. PDF는 jsPDF + html2canvas (`vendor/`) |
| DB · 인증 | **Supabase** (PostgreSQL) | 이메일 6자리 코드 로그인, 행 단위 권한(RLS)으로 관리자·크루·고객 권한 분리 |
| 서버 기능 | Supabase Edge Functions | `notify-new-request` (신규 요청 푸시 알림), `manage-crew` (크루 초대·관리) |
| 알림 | Web Push (Service Worker) | `sw.js`, `manifest.json` — 휴대폰 홈 화면에 추가해 앱처럼 사용 |
| 소스 관리 · 개발 | **GitHub** | 저장소, 브랜치 관리, 이슈 |
| 자동화 | GitHub Actions | `keep-supabase-alive.yml` — 무료 플랜 자동 정지를 막기 위해 3일마다 두 DB를 깨움 |
| 배포 | GitHub Pages (dev) · Netlify (main) | push하면 자동 배포 |

---

## 폴더 구조

`(dev)` 표시는 아직 `dev` 브랜치에만 있는 파일입니다.

```
├── dokgodali-quote-flow.html     이사 견적 (고객)
├── dokgodali-delivery.html       한국행 배송 예약 (고객)
├── dokgodali-delivery-pricing.js 배송 운임 계산 규칙 (dev)
├── dokgodali-schedule.html       스케줄 관리 (관리자·크루)
├── dokgodali-config.js           주소별 DB 선택 + 테스트 띠 표시
├── dokgodali-*.css               페이지별 스타일 (공통: dokgodali-shared.css)
├── sql/                          Supabase 테이블·권한 정의
├── supabase/functions/           Edge Functions
├── tests/                        운임 계산 테스트 (node --test, dev)
├── docs/superpowers/             기능별 설계·구현 계획 문서
└── scripts/                      번역·빌드 보조 스크립트
```

---

## 현재 진행 상황 (2026년 11월)

- **배송 예약 개편** — 박스별 입력(최대 50개), 중량별 운임과 추가 운임 자동 계산, 타지역 픽업, 통관 구분·카카오톡 ID 등. **dev 반영 완료, 클라이언트 확인 대기 중.** 확인이 필요한 항목은 `dev` 브랜치의 `클라이언트_확인사항.md`에 정리되어 있습니다.
- **영문판** — 이사 견적·스케줄 관리의 영문 페이지가 있으며, 배송 예약과 이번 개편 내용의 영문판은 추후 업로드 예정입니다.

---

## 실사용 전환 전 남은 검토 사항

1. **결제** — 예약금·잔금을 받을 결제 수단(계좌이체 확인 절차 등)과 입금 확인 흐름
2. **법률·세무** — 견적서·약관·보상 규정 문구의 독일 변호사·세무사 검토, Impressum 게재
3. **개인정보 (DSGVO/GDPR)** — 개인정보처리방침, 보관 기간, 삭제 절차
4. **근무시간 월 마감** — 월말 기록 잠금과 PDF 보관 (독일 근로시간 기록 2년 보관 의무)
5. **배송 업무 후속 단계** — 누락 정보 재요청, 견적서·영수증 자동 발행, 엑셀 연동
