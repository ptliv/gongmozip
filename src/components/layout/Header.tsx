"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpenCheck,
  Bookmark,
  Clock3,
  FileText,
  Menu,
  MessageSquareText,
  Newspaper,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/contests", label: "공고 탐색", icon: Newspaper },
  { href: "/deadline", label: "마감 관리", icon: Clock3 },
  { href: "/guides", label: "준비 가이드", icon: BookOpenCheck },
  { href: "/#briefing", label: "공모전 브리핑", icon: FileText },
  { href: "/community", label: "커뮤니티", icon: MessageSquareText },
  { href: "/bookmarks", label: "북마크", icon: Bookmark },
] as const;

const QUICK_LINKS = [
  { href: "/contests?type=공모전", label: "공모전" },
  { href: "/contests?type=대외활동", label: "대외활동" },
  { href: "/contests?type=인턴십", label: "인턴십" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  const base = href.split("?")[0]?.split("#")[0] ?? href;
  return pathname === base || (base !== "/" && pathname.startsWith(`${base}/`));
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/92 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 shadow-sm transition-colors group-hover:bg-amber-700">
              <Trophy className="h-4 w-4 text-amber-200" aria-hidden="true" />
            </span>
            <span className="text-[1.0625rem] font-black tracking-tight text-zinc-950 whitespace-nowrap">
              공모전<span className="text-amber-700">집</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="주요 메뉴">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
                    active
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/contests" className="btn-primary px-4 py-2 whitespace-nowrap">
              <Search className="h-4 w-4" aria-hidden="true" />
              공고 검색
            </Link>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Link href="/contests" className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100" aria-label="공고 검색">
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="메뉴 열기"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-stone-200 py-3 lg:hidden">
            <nav className="grid gap-1" aria-label="모바일 메뉴">
              {NAV_LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                      active ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center text-xs font-bold text-zinc-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
