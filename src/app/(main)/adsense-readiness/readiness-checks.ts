export type CheckStatus = "pass" | "warn" | "info";

export interface CheckItem {
  readonly label: string;
  readonly status: CheckStatus;
  readonly note: string;
}

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
const ADSENSE_SCRIPT_NOTE = ADSENSE_CLIENT_ID
  ? `RootLayout <head> · async script · crossOrigin=anonymous · ${ADSENSE_CLIENT_ID}`
  : "RootLayout <head> · async script · crossOrigin=anonymous · NEXT_PUBLIC_ADSENSE_CLIENT 설정 필요";

export const STATIC_CHECKS: readonly CheckItem[] = [
  {
    label: "Google AdSense 스크립트",
    status: "pass",
    note: ADSENSE_SCRIPT_NOTE,
  },
  {
    label: "ads.txt",
    status: "pass",
    note: "루트 /ads.txt에 google.com, pub-7242419267984081, DIRECT, f08c47fec0942fa0 공개",
  },
  {
    label: "/adsense-readiness noindex",
    status: "pass",
    note: "robots: { index: false, follow: false } - 이 페이지는 색인 제외",
  },
  {
    label: "/about 서비스 소개 페이지",
    status: "pass",
    note: "정적 페이지 · canonical 설정 · sitemap 포함 · 수집 방식·수정/삭제 요청 안내 포함",
  },
  {
    label: "/privacy 개인정보처리방침",
    status: "pass",
    note: "AdSense 쿠키 정책·Google 정책 링크 포함",
  },
  {
    label: "/terms 이용약관",
    status: "pass",
    note: "광고 조항·면책 조항 포함",
  },
  {
    label: "/contact 문의하기",
    status: "pass",
    note: "도메인 이메일 및 카카오톡 채널 CTA · 수정/삭제 요청·서비스 문의·일반 문의 안내",
  },
  {
    label: "공개 문의 채널",
    status: "pass",
    note: "info@gongmozip.com 도메인 이메일과 문의 페이지를 공개",
  },
  {
    label: "Footer 신뢰 링크",
    status: "pass",
    note: "소개·개인정보·이용약관·문의 - 데스크톱 열 + 모바일 바 양쪽 노출",
  },
  {
    label: "canonical / metadataBase 도메인 일관성",
    status: "pass",
    note: "getSiteUrl() 유틸로 gongmozip.com 통일 · www 혼선 없음 · 상세·목록·정책 페이지 모두 적용",
  },
  {
    label: "robots.txt",
    status: "pass",
    note: "Googlebot · AdsBot-Google · Mediapartners-Google 공개 페이지 허용",
  },
  {
    label: "sitemap.xml",
    status: "pass",
    note: "홈·목록·공고 상세·신뢰 4개 페이지 포함 · /adsense-readiness 제외",
  },
  {
    label: "공고 상세 - 신청 플랫폼 안내 문구",
    status: "pass",
    note: "상세 하단에 '참가 신청 전 최신 모집 요강과 접수 조건 확인' 명시",
  },
  {
    label: "공고 상세 디버그 블록",
    status: "pass",
    note: "NEXT_PUBLIC_SHOW_DEBUG_FIELDS=true 일 때만 노출 (운영 기본 숨김)",
  },
  {
    label: "콘텐츠 충분성",
    status: "pass",
    note: "공고 상세 200개 이상 + 정책 4개 + 분야·유형·카테고리 페이지",
  },
  {
    label: "가짜 정보 / 허위 광고 없음",
    status: "pass",
    note: "실제 공개 데이터 기반 · 허위 리뷰·보증·주소·전화번호 없음",
  },
  {
    label: "회원가입 강제 없음",
    status: "pass",
    note: "모든 공개 페이지 로그인 없이 접근 가능",
  },
  {
    label: "모바일 반응형",
    status: "pass",
    note: "Tailwind 반응형 레이아웃 전체 적용",
  },
  {
    label: "HTTPS",
    status: "pass",
    note: "gongmozip.com - Cloudflare TLS",
  },
];
