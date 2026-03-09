"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trophy, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/contests", label: "공고 목록" },
  { href: "/deadline", label: "마감임박" },
  { href: "/bookmarks", label: "북마크" },
  { href: "/contests?type=공모전", label: "공모전" },
  { href: "/contests?type=대외활동", label: "대외활동" },
  { href: "/contests?type=인턴십", label: "인턴십" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base || (base !== "/" && pathname.startsWith(base));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm group-hover:shadow-blue-glow transition-all duration-200">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-[1.0625rem] tracking-tight">
              공모전<span className="text-blue-600">집</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname === link.href.split("?")[0] && !link.href.includes("?");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive(link.href)
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-blue-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/contests"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all duration-150 shadow-sm"
            >
              공고 검색
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴 토글"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 pb-4 animate-fade-in-up">
            <nav className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 px-1">
                <Link
                  href="/contests"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  공고 검색
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
