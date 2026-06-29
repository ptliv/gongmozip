# 공모전집 AdSense 승인 실패 감사 리포트

작성일: 2026-06-30 KST
대상 도메인: `gongmozip.com`, `www.gongmozip.com`

## 1. 결론

이번 승인 실패의 가장 유력한 원인은 단일 문제가 아니라 다음 네 가지가 겹친 상태로 판단한다.

1. AdSense 스크립트가 방문자 상호작용 또는 60초 지연 후 로드될 수 있어, 심사 크롤러가 코드 미설치 또는 불완전 설치로 볼 가능성이 있었다.
2. 운영 기준 도메인이 Cloudflare 이전 후 `gongmozip.com`인데, 앱 fallback canonical은 `www.gongmozip.com` 중심이었다.
3. 공개 공고 표면에 같은 제목과 같은 마감일의 교차 출처 중복이 35그룹 있었다. 이 중 주최까지 같은 exact 중복은 20그룹이었다.
4. 크롤링 데이터에 단위 없는 상금 숫자 조각, 시작 전 공고의 `ongoing` 상태, 이미지 없는 공개 후보가 남아 있었다.

`ads.txt` 자체는 배포 도메인에서 정상 확인됐다. 다만 AdSense 콘솔의 `ads.txt 없음` 경고는 Google 재크롤링 지연, apex/www 등록 도메인 불일치, 또는 이전 배포/캐시 상태 때문에 늦게 해소될 수 있다.

## 2. 공식 기준 요약

참고한 Google 공식 문서:

- AdSense 사이트 연결: https://support.google.com/adsense/answer/7584263
- AdSense ads.txt 안내: https://developers.google.com/adsense/platforms/transparent/ads-txt
- AdSense meta tag 안내: https://developers.google.com/adsense/platforms/transparent/meta-tags
- AdSense 프로그램 정책: https://support.google.com/adsense/answer/48182
- Google 게시자 정책: https://support.google.com/adsense/answer/10502938
- AdSense 크롤러와 robots.txt: https://support.google.com/adsense/answer/10532
- Google robots.txt 기본 문서: https://developers.google.com/crawling/docs/robots-txt/create-robots-txt

핵심 기준은 다음과 같다.

- AdSense 코드는 사이트의 모든 페이지에서 접근 가능한 `<head>` 영역에 설치되어야 한다.
- `ads.txt`는 도메인 루트에서 `text/plain`으로 접근 가능해야 한다.
- Google 광고 크롤러가 공개 페이지를 robots.txt로 차단당하면 안 된다.
- 사이트는 독창적 가치, 충분한 콘텐츠, 명확한 탐색, 정책 준수, 개인정보/쿠키 고지를 갖춰야 한다.
- 광고는 비콘텐츠 페이지, 빈 페이지, 기만적 탐색, 정책 위반 콘텐츠 위에 올라가면 안 된다.

## 3. 적용한 코드 수정

- `src/app/layout.tsx`
  - 지연 로더 `AdSenseLoader` 제거.
  - AdSense async script를 루트 레이아웃 `<head>`에 직접 주입.
  - `google-adsense-account` meta 값을 상수화해 스크립트 client와 불일치 가능성을 제거.

- `public/ads.txt`
  - 다음 값이 루트 파일로 존재함을 확인.
  - `google.com, pub-7242419267984081, DIRECT, f08c47fec0942fa0`

- `src/lib/seo.ts`, `.env.local.example`
  - 기본 canonical을 `https://gongmozip.com`으로 통일.
  - alternate 도메인은 `https://www.gongmozip.com`으로 정리.

- `public/robots.txt`
  - `Googlebot`, `AdsBot-Google`, `Mediapartners-Google` 공개 페이지 허용을 정적 파일로 명시.
  - `/admin`, `/adsense-readiness`는 계속 차단.
  - Worker CPU에 의존하지 않도록 App Router metadata route에서 public asset으로 이동.

- `src/app/(main)/privacy/page.tsx`
  - AdSense 게시자 ID, 쿠키/맞춤 광고, 제3자 광고 사업자, `ads.txt`, Google 광고 기술 제공업체, opt-out 링크를 명시.

- `src/lib/contest-dedupe.ts`, 공개 조회 코드
  - 같은 제목, 같은 주최, 같은 마감일의 공개 공고는 한 건만 노출.
  - 같은 제목과 마감일이어도 주최가 다르면 별개 공고로 보존.

- `public/sitemap.xml`, `scripts/deploy/generate_static_seo_files.py`
  - sitemap을 Worker route가 아닌 정적 public asset으로 생성.
  - 공식 URL과 공개 검수 기준을 통과한 색인 대상 URL만 포함.

- `src/lib/prize.ts`
  - `최고상: 1000000`은 `최고상: 100만원`처럼 표시.
  - `총상금: 4`처럼 단위 없는 작은 숫자 조각은 상금 표시에서 제외.

- `scripts/utils/supabase_client.py`
  - 신규 크롤링 저장 시 날짜 기반으로 `upcoming`, `ongoing`, `closed` 상태를 산정.
  - 오늘 마감 공고는 날짜만으로 즉시 `closed` 처리하지 않도록 정리.

## 4. 적용한 데이터 정리

Supabase 전체 389건을 점검하고 다음 정리를 실행했다.

- 자동 점수 재계산: 389건 처리, 실패 0건.
- 운영자 검수 레벨 2건은 보존.
- 시작 전인데 `ongoing`이던 24건을 `upcoming`으로 변경.
- 공개 exact 중복 20그룹에서 비대표 20건을 `verified_level=0`으로 낮춰 공개 제외.
- 주최 문자열이 다른 near duplicate 15건은 과도한 숨김을 피하기 위해 공개 후보로 복구.
- 이미지 없는 미래 공개 후보 2건은 재점수화 후 공개 제외 상태가 됨.
- 2026-06-30 이전으로 진짜 만료된 공개 후보는 0건.
- 2026-06-30 당일 마감 49건은 강제 삭제/폐쇄하지 않음.

수정 후 집계:

| 항목 | 수정 후 |
| --- | ---: |
| 전체 공고 | 389 |
| 상태 `ongoing` | 365 |
| 상태 `upcoming` | 24 |
| 공개 후보 | 312 |
| 공개 exact 중복 제목+주최+마감 그룹 | 0 |
| 공개 near 중복 제목+마감 그룹 | 15 |
| 정적 sitemap URL | 142 |
| 미래 공개 후보 중 이미지 누락 | 0 |
| 시작 전인데 `ongoing` | 0 |
| 2026-06-30 이전 만료 후보 | 0 |

## 5. 남은 리스크

AdSense 재심사 전 가장 중요한 잔여 리스크는 콘텐츠 가치다.

- 공고 설명 다수가 같은 생성 템플릿 구조를 공유한다. Google이 “가치가 별로 없는 콘텐츠”로 판단할 수 있으므로, 인기/협찬/상위 노출 공고부터 고유 요약, 준비 포인트, 제출 체크리스트를 강화하는 것이 좋다.
- DB 원문에는 아직 `총상금: 4` 같은 단위 없는 원시 benefit 값이 121건 있다. 화면 표시는 방어했지만, 크롤러 정규화 단계에서 원천 수정하는 후속 작업이 필요하다.
- AdSense 콘솔의 `ads.txt 없음` 경고는 Google 재크롤링에 시간이 걸릴 수 있다. Cloudflare DNS 이전 직후라면 24-48시간 정도 지연될 수 있다.
- 재심사 전에는 `gongmozip.com`과 `www.gongmozip.com` 중 AdSense에 등록한 사이트가 실제 canonical 및 `ads.txt` 접근 도메인과 일치하는지 확인해야 한다.

## 6. 재심사 전 체크리스트

1. `https://gongmozip.com/ads.txt`와 `https://www.gongmozip.com/ads.txt`가 모두 200으로 열리는지 확인.
2. 홈페이지 HTML에 `ca-pub-7242419267984081` meta와 AdSense script가 초기 응답에 포함되는지 확인.
3. `robots.txt`에 `Mediapartners-Google` 차단이 없는지 확인.
4. sitemap의 `<loc>`가 `https://gongmozip.com/...` 기준으로 나오는지 확인.
5. 공개 목록에서 같은 제목+마감의 중복 카드가 없는지 확인.
6. 협찬/공식 검수 공고의 상세 페이지에 이미지, 주최/주관, 신청 링크, 문의처, 마감일이 모두 보이는지 확인.
7. AdSense 콘솔에서 `ads.txt` 상태가 갱신된 뒤 재검토 요청.
