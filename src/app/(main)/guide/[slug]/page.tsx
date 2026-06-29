import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticleDetail } from "@/components/guide/GuideArticleDetail";
import { GUIDE_ARTICLES, getGuideArticle } from "@/data/guides";
import { canonicalUrl } from "@/lib/seo";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getGuideArticle(params.slug);
  if (!article) {
    return {
      title: "가이드를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/guide/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: canonicalUrl(canonicalPath) },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: canonicalUrl(canonicalPath),
    },
  };
}

export default function GuideAliasDetailPage({ params }: Props) {
  const article = getGuideArticle(params.slug);
  if (!article) notFound();

  return <GuideArticleDetail article={article} canonicalPath={`/guide/${article.slug}`} />;
}
