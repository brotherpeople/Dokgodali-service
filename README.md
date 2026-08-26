# 독고달이 (Dokgodali)

독일 고속도로를 달리는 이사 도우미 — 이사 견적을 자동으로 계산하고 공식 견적서(PDF)까지
발급하는 웹 서비스의 프로토타입입니다.

현재는 백엔드 없이 **단일 HTML 파일 하나로 동작하는 클라이언트 사이드 프로토타입**입니다.
디자인은 `pen.dev`에서 작업 중인 원본 목업을 기반으로 만들었고, 이 저장소는 그 목업을
실제로 동작하는 견적 계산기로 옮기는 단계입니다. 추후 실제 웹사이트(백엔드 포함)로
전환할 때의 기준선(baseline) 역할을 합니다.

**[여기에서 바로 사용해 볼 수 있습니다 →](https://brotherpeople.github.io/Dokgodali-service/)**
(GitHub Pages로 배포된 실제 페이지라 주소 자동완성과 PDF 다운로드까지 전부 정상 동작합니다.
저장소 설정에서 Pages를 켜야 링크가 열립니다 — 아래 "GitHub Pages 켜기" 참고)

## 지금 되는 것

- **Step 1 — 부피 계산**: 가구/가전 품목과 수량, 조립 여부를 선택하면 부피가 계산되고
  차량(M/L/XL/XXL)이 자동으로 추천됨. 인원/시간을 조절하면 실시간으로 가격이 바뀜.
- **Step 2 — 경로 및 옵션**: 출발지(필수)/목적지(미정 허용) 주소, 층수·엘리베이터
  유무(모름 포함), 주차 허가구역 신청, 특수 품목, 동승자/반려동물, 이사 일정을 입력.
  주소는 4글자 이상 입력 시 OpenStreetMap Nominatim으로 자동완성(우편번호 누락 방지).
- **Step 3 — 공식 견적서**: 고객 정보(이름/연락처/이메일) 입력 후 견적서 미리보기가
  뜨고, 실제 PDF 파일로 다운로드 가능(jsPDF + html2canvas, 완전히 오프라인 동작).

## 폴더 구조

```
dokgodali-quote-flow.html      개발용 원본 (여기만 고치면 됨, images/ 상대경로 사용)
dokgodali-quote-flow.artifact.html   공유용 빌드 산출물 (git에는 안 올라감, 아래 빌드 방법 참고)
images/                        차량/로고 이미지
vendor/                        오프라인 PDF 생성을 위해 인라인하는 라이브러리 원본
                                (jsPDF 2.5.1, html2canvas 1.4.1 — MIT License)
scripts/build-artifact.py      위 두 파일을 합쳐 공유용 단일 HTML을 만드는 빌드 스크립트
reference/                     독일 이사업체 견적서 양식 참고 자료(예시 값, 실제 데이터 아님)
```

## 로컬에서 실행하기

`dokgodali-quote-flow.html`을 브라우저로 그냥 열면 됩니다. 별도 서버나 설치가 필요 없습니다.

```
# Windows
start dokgodali-quote-flow.html
```

## GitHub Pages 켜기 (최초 1회만)

1. 저장소 **Settings → Pages**로 이동
2. **Source**를 `Deploy from a branch`로, **Branch**를 `main` / `/ (root)`로 설정 후 저장
3. 1~2분 뒤 `https://brotherpeople.github.io/Dokgodali-service/` 에서 바로 접속 가능
   (루트의 `index.html`이 `dokgodali-quote-flow.html`로 자동 이동시켜줍니다)

## 공유용(Artifact) 빌드 만들기

Claude Artifact 같이 외부 파일을 읽지 못하는 환경에 배포하려면, 이미지를 base64로
인라인한 자체완결형 파일이 필요합니다.

```
python scripts/build-artifact.py
```

`dokgodali-quote-flow.artifact.html`이 생성됩니다 (git에는 커밋하지 않음 — 언제든 위
명령으로 다시 만들 수 있고, base64 때문에 diff가 무의미하기 때문).

## 알려진 제약

- **주소 자동완성**은 외부 API(Nominatim)를 호출하기 때문에, 외부 네트워크 요청이 막힌
  샌드박스 환경(예: Claude Artifact 미리보기)에서는 자동완성 없이 일반 텍스트 입력으로만
  동작합니다. 트래픽이 커지면 Google Places/HERE 같은 유료 API로 교체를 권장합니다.
- **PDF 다운로드**는 일반 브라우저(로컬 파일, 실제 운영 도메인)에서는 그대로 다운로드가
  되지만, 샌드박스 환경에서는 페이지가 직접 다운로드를 트리거할 수 없어 별도의 저장 권한
  기능이 필요합니다.
- 회사 등기정보/법적 문구(`COMPANY_INFO`, `LEGAL_TEXT`)는 현재 예시(Muster) 값입니다.
  실제 값이 정해지면 `dokgodali-quote-flow.html` 상단의 해당 객체만 교체하면 됩니다.
- 이동 거리(km) 기반 요금은 아직 계산하지 않습니다 (주소만으로는 실제 거리 산출 불가,
  추후 지도 API 연동 필요).

## 다음 단계 (실제 웹사이트 전환 시 고려할 것)

- 정적 HTML → 실제 프론트엔드 프레임워크 + 백엔드(견적 저장, 이메일 발송, 결제 연동)
- 주소 자동완성/거리 계산을 위한 지도 API 계약
- 회사 등기정보 확정 및 `COMPANY_INFO`/`LEGAL_TEXT` 실제 값 반영
- `pen.dev` 원본 디자인과의 지속적인 동기화
