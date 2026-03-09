import type { Metadata } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    template: "%s | 공모전집",
  },
  description:
    "공모전, 대외활동, 인턴십 정보를 한곳에서 찾는 플랫폼 공모전집. 대학생 공모전과 마감 임박 공고를 빠르게 확인하세요.",
  keywords: ["공모전", "대외활동", "인턴십", "청년", "대학생", "취업", "공모전집"],
  openGraph: {
    title: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    description:
      "공모전, 대외활동, 인턴십 정보를 한곳에서 찾는 플랫폼 공모전집. 대학생 공모전과 마감 임박 공고를 빠르게 확인하세요.",
    url: SITE_URL,
    siteName: "공모전집",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "공모전집 | 공모전·대외활동·인턴십 정보 플랫폼",
    description:
      "공모전, 대외활동, 인턴십 정보를 한곳에서 찾는 플랫폼 공모전집. 대학생 공모전과 마감 임박 공고를 빠르게 확인하세요.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans">
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7242419267984081"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
