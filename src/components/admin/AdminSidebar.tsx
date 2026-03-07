"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ArrowLeft,
  Trophy,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/login/actions";

const NAV = [
  {
    label: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "공고 관리",
    href: "/admin/contests",
    icon: ClipboardList,
    exact: false,
  },
];

interface AdminSidebarProps {
  userEmail?: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-gray-100">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">공모전집</div>
          <div className="text-[10px] text-gray-400 font-medium tracking-wide">
            ADMIN
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* 하단 */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-3 space-y-1">
        {/* 사이트로 이동 */}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          사이트로 이동
        </Link>

        {/* 로그인 계정 + 로그아웃 */}
        {userEmail && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <UserCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">{userEmail}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
