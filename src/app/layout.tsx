import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const SITE_URL = getSiteUrl();
const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
const ADSENSE_SCRIPT_SRC = ADSENSE_CLIENT_ID
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`
  : null;
const SITE_DESCRIPTION =
  "공모전집은 공모전, 대외활동, 인턴십, 교육 정보를 일정, 혜택, 지원 조건, 준비 난이도 기준으로 정리해 지원 여부를 빠르게 판단할 수 있도록 돕는 공고 탐색 서비스입니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    template: "%s | 공모전집",
  },
  description: SITE_DESCRIPTION,
  keywords: ["공모전", "대외활동", "인턴십", "청년", "대학생", "취업", "공모전집"],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "공모전집",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    description: SITE_DESCRIPTION,
  },
  other: ADSENSE_CLIENT_ID
    ? {
        "google-adsense-account": ADSENSE_CLIENT_ID,
      }
    : undefined,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {ADSENSE_SCRIPT_SRC && (
          <script
            id="gongmozip-adsense"
            async
            src={ADSENSE_SCRIPT_SRC}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
