# CLAUDE.md

이 파일은 Claude Code가 이 저장소를 처음 열었을 때 빠르게 맥락을 잡기 위한 가이드입니다.
일반적인 코드 구조는 README/소스 그 자체에서 읽고, 여기에는 **읽어도 모를 정보**(목표, 결정의 배경, 미해결 작업)만 적습니다.

---

## 1. 프로젝트 정체

- **사이트**: [mongolryokou.com](https://mongolryokou.com)
- **상호**: Milkyway Japan (モンゴリア銀河系)
- **사업**: 일본인 대상 몽골 현지 여행사 (B2C)
- **운영 언어**: 일본어 (관리자 페이지만 한국어)
- **타겟 시장**: 일본 (KR/EN 페이지 없음)

## 2. 비즈니스 목표 (SEO)

오너가 명확히 밝힌 단일 목표:
> **Google 일본어 검색 「モンゴル旅行」관련 키워드에서 1위.**

현실 진단 (2026-05-02 기준 GSC):
- 3개월 노출: **346회** — 매우 낮음
- 평균 CTR 41.6% — 비정상적으로 높음 → **거의 다 브랜드 검색**
- 1위 키워드 "モンゴル旅行社" (CTR 61.3%) — 단골 트래픽
- 「모ンゴル旅行」같은 큰 정보성 키워드는 **사실상 노출되지 않는 상태**
- 결론: 현재 단계는 SEO 초기. 빅 키워드 1위는 6~12개월 콘텐츠 + 백링크 + 시간 필요.
- 권장 전략: 롱테일 키워드(モンゴル ビザ, ゴビ砂漠ツアー 등)부터 다발로 점령 → 신뢰도 누적 → 빅 키워드 따라옴

## 3. 기술 스택 핵심

- React 19 + TypeScript + Vite
- Cloudflare Pages (정적 호스팅) + Pages Functions (서버리스 API)
- D1 (SQLite, Cloudflare 관리형) + Drizzle ORM
- Tailwind CSS
- TanStack Query, react-i18next (다국어), react-helmet-async (SEO)
- 결제: PayPal + 은행 송금
- 챗: Channel Talk (지연 로딩)

## 4. 배포 워크플로 — **반드시 지킬 것**

`DEPLOYMENT.md`에 명시되어 있고 오너가 강조하는 규칙:

> **`main`에 직접 푸시 금지.** 항상 feature 브랜치 → PR → Cloudflare 미리보기 검증 → 머지.

- 머지 시 Cloudflare가 자동으로 운영 배포 (1~3분)
- 미리보기 URL 패턴: `https://<branch-slug>.milkyway-japan-axy.pages.dev`
  - 슬래시(`/`)는 하이픈으로 변환됨 (예: `fix/sitemap-categories` → `fix-sitemap-categories`)
- `https://milkyway-japan-axy.pages.dev` (브랜치 prefix 없음) = 운영 별칭(main 미러)
- 운영 도메인: `https://mongolryokou.com` (Cloudflare 캐시 1시간, max-age=3600)

검증 시 캐시 우회: `?bust=$(date +%s)` 쿼리 붙이거나 Cache-Control: no-cache 헤더.

## 5. SEO 인프라 (이미 구축된 것)

### 5.1 메타태그 / 구조화 데이터

| 위치 | 내용 |
|---|---|
| `index.html` | TravelAgency + WebSite JSON-LD, OG, Twitter, hreflang, pre-render SEO content (#root .pre-render-seo, 시각적으로 숨김 + 크롤러용) |
| `src/components/seo/SEO.tsx` | 모든 페이지에서 쓰는 공통 SEO 컴포넌트. `structuredData` prop으로 JSON-LD 다중 스키마 지원 |
| `src/constants/seo.ts` | `SITE_URL`, 기본 타이틀/디스크립션/키워드 (트레일링 슬래시 없음) |

### 5.2 페이지별 JSON-LD 현황

| 페이지 | 스키마 |
|---|---|
| `Home.tsx` | (index.html에 TravelAgency + WebSite) |
| `ProductDetail.tsx` | Product + TouristTrip + Offer/AggregateOffer + MerchantReturnPolicy + OfferShippingDetails + BreadcrumbList + aggregateRating/review (있을 때) |
| `TravelGuideDetail.tsx` | BlogPosting + BreadcrumbList |
| `CategoryPage.tsx` | CollectionPage + ItemList + BreadcrumbList |
| `TourProducts.tsx` | CollectionPage + ItemList + BreadcrumbList ← **2026-05-02 추가** |
| `TravelGuide.tsx` | CollectionPage + ItemList + BreadcrumbList ← **2026-05-02 추가** |
| `FAQ.tsx`, `About.tsx`, `UserReviews.tsx` | 각자 적절한 스키마 보유 |

### 5.3 Sitemap (`functions/sitemap.xml.ts`)

- 동적 생성. D1에서 products / categories / magazines를 읽음
- robots.txt에서 참조: `https://mongolryokou.com/sitemap.xml`
- 현재 24개 URL + 11개 이미지 (image:image)
- xmlns:image 네임스페이스 선언됨

## 6. ⚠️ 주의해야 할 함정

### 6.1 categories 테이블에 `updated_at` / `created_at` 컬럼 **없음**

`migration_sql/create_all_tables.sql`의 `CREATE TABLE categories`는 시간 컬럼을 정의하지 않음.
이 때문에 `COALESCE(updated_at, created_at)` 같은 SQL이 통째로 실패하고,
sitemap.xml.ts의 try/catch가 에러를 조용히 삼켜서 카테고리 URL이 통째로 누락됐던 버그가 있었음(이미 수정됨).

→ **categories를 시간 기준으로 정렬/조회하지 말 것.** 필요하면 마이그레이션 먼저.

### 6.2 magazines 테이블 컬럼 분기

`functions/api/migrate-db.ts`에서 마이그레이션을 적용. 환경에 따라 `is_published` 또는 `is_active` 컬럼이 있을 수 있어 sitemap.xml.ts는 둘 다 fallback으로 시도함.

### 6.3 API 응답이 snake_case + camelCase 혼재

`/api/products`가 같은 데이터를 두 표기로 다 내려줌 (예: `mainImages`와 `main_images` 둘 다 존재). 프론트는 camelCase 위주로 쓰고, 함수 안에서 D1 직접 쿼리할 때만 snake_case가 나옴. 혼동 주의.

### 6.4 운영 데이터에 한국어 흔적

- magazine 카테고리/내용 일부가 한국어로 작성된 적이 있음. 운영 페이지는 모두 일본어가 맞으므로, 문자열 추가 시 일본어로 작성.
- 관리자 페이지(`Admin*.tsx`)만 한국어 운영.

### 6.5 채팅 위젯 (Channel Talk)

`index.html`에서 stub만 inline으로 로드하고, 실제 SDK는 `requestIdleCallback` 또는 5초 후 lazy load. LCP/TBT 보호. 절대 main bundle에 넣지 말 것.

## 7. 최근 작업 이력 (오너가 기억해야 할 것)

### 2026-05-02 — SEO 작업 시리즈

#### PR #1 (머지됨) — `fix/sitemap-categories`
- categories의 SQL 버그 수정 → `/category/central-mongolia`, `/horse-riding-tour`, `/gobi-desert` 3개 URL이 sitemap에 복구됨
- 홈 URL을 canonical과 일치시켜 트레일링 슬래시 추가
- `/privacy-policy`, `/terms-of-service` sitemap에 추가
- Sitemap URL 19 → 24개

#### PR #2 (머지됨) — `feat/seo-image-sitemap-and-list-jsonld`
- sitemap에 `xmlns:image` 네임스페이스 + `<image:image>` 태그 (상품 main_images 첫 5장, 매거진 thumbnail)
- XML 이스케이프 함수 추가 (& 등)
- `TourProducts.tsx`(`/products`), `TravelGuide.tsx`(`/travel-guide`)에 CollectionPage + ItemList + BreadcrumbList 구조화 데이터 추가
- Sitemap 4451 → 5934 bytes (이미지 11장)

#### 분석 작업 (코드 변경 없음)
- 매거진 5편 콘텐츠 깊이 점검: 평균 8,800자(HTML 기준), 모두 観光 카테고리에 몰림
- 다른 카테고리(準備, 情報, グルメ)는 0편 — 큰 격차
- 일본어 「モンゴル旅行」1위를 위한 40편 콘텐츠 로드맵 작성 (대화 중 전달, 별도 파일 없음)
- GSC 진단 (브랜드 검색 위주, 빅 키워드 노출 거의 없음)

## 8. 다음에 이어 할 작업 (오픈된 스레드)

### 🔥 즉시 가능
1. **GSC에서 sitemap 재제출** — Search Console → Sitemaps → 다시 제출 (사용자 액션 필요)
2. **GSC 상위 20개 쿼리 데이터 수집** — 노출수 정렬 스크린샷 (사용자 액션 대기 중)
3. **글 목차 초안 작성** — 1순위 10편 (モンゴル ビザ, モンゴル 旅行 費用 등). GSC 데이터 받으면 우선순위 재조정 후 시작.

### 🟠 중기
4. **ProductDetail / TravelGuideDetail 이미지 alt 점검** — 일본어 키워드 들어가 있는지
5. **기존 매거진 5편 SEO 보강** — 본문 끝에 "관련 ツアー" 섹션 추가 (상품 페이지 내부 링크)
6. **백링크 전략** — 일본 여행 블로그/매체 협업, Google Business Profile 등록

### 🟡 장기 (콘텐츠 채우기)
7. 매거진 카테고리별 콘텐츠 확장:
   - 準備: 12편 (비자, 비용, 시기, 짐, 환전, 안전 등)
   - 情報: 10편 (문화, 역사, 나담제, 언어 등)
   - 観光: 5편 → 15편 (지역별 상세)
   - グルメ: 8편 (호쇼르, 보즈, 호르호그 등)

## 9. 작업 시 따라야 할 규칙 (오너 명시)

- ✅ feature 브랜치 → PR → Cloudflare 미리보기 검증 → 머지
- ✅ 운영 사이트는 일본어 (관리자만 한국어)
- ✅ 커밋 메시지는 한국어로 (기존 스타일 유지: `[영역]: 설명`)
- ❌ `main` 직접 푸시 금지
- ❌ 운영 데이터/스키마 변경은 마이그레이션 통해서만 (`functions/api/migrate-db.ts`)

## 10. 다른 환경에서 작업 이어가는 법

1. 저장소 클론: `git clone https://github.com/arvijixmeat-maker/MILKYWAY-JAPAN.git`
2. 이 파일(CLAUDE.md) 읽고 맥락 파악
3. 최근 git log 확인: `git log --oneline -20`
4. **GSC 데이터 사용자에게 요청** — 작업 우선순위는 데이터 기반으로 결정
5. 작업 → feature 브랜치 → PR → 미리보기 URL 사용자에게 전달 → 사용자가 머지

---

마지막 업데이트: 2026-05-02
