import { Metadata } from "next";
import { Trophy, AlertCircle } from "lucide-react";
import { loginAction } from "./actions";
import { LoginSubmitButton } from "./LoginSubmitButton";

export const metadata: Metadata = { title: "관리자 로그인" };

const ERROR_MESSAGES: Record<string, string> = {
  credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  empty: "이메일과 비밀번호를 입력해주세요.",
  unauthorized: "접근 권한이 없는 계정입니다. 관리자에게 문의하세요.",
};

interface Props {
  searchParams: { error?: string };
}

export default function AdminLoginPage({ searchParams }: Props) {
  const errorMsg = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ?? "로그인에 실패했습니다.")
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mb-3 shadow-md">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">공모전집</h1>
          <p className="text-sm text-gray-500 mt-0.5">관리자 로그인</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
          {/* 에러 배너 */}
          {errorMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            {/* 이메일 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                이메일
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 transition-all hover:border-gray-300"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 transition-all hover:border-gray-300"
              />
            </div>

            <LoginSubmitButton />
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          관리자 계정이 없다면 Supabase 대시보드에서 생성하세요.
        </p>
      </div>
    </div>
  );
}
