import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { requestLoginLinkAction } from "./actions";

export const metadata: Metadata = {
  title: "로그인",
};

interface LoginPageProps {
  readonly searchParams: {
    readonly next?: string;
    readonly sent?: string;
    readonly error?: string;
  };
}

function errorMessage(error?: string): string | null {
  if (error === "email") return "이메일을 입력해 주세요.";
  if (error === "send") return "로그인 링크 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  return null;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/community/write";
  const message = errorMessage(searchParams.error);

  return (
    <section className="border-b border-stone-200 bg-stone-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_24rem]">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">Member Login</p>
          <h1 className="mt-3 text-3xl font-black text-zinc-950">커뮤니티 작성 로그인</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            공모전집 커뮤니티는 로그인 사용자만 글을 작성할 수 있습니다. 이메일로 받은 링크를 누르면 바로 작성 화면으로 돌아옵니다.
          </p>
        </div>

        <form action={requestLoginLinkAction} className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <input type="hidden" name="next" value={next} />
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-amber-200">
            <Mail className="h-5 w-5" />
          </div>
          <label className="mt-5 block space-y-1.5">
            <span className="text-sm font-bold text-zinc-800">이메일</span>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm"
            />
          </label>
          {message && <p className="mt-3 text-sm font-bold text-red-600">{message}</p>}
          {searchParams.sent === "1" && (
            <p className="mt-3 text-sm font-bold text-emerald-700">
              로그인 링크를 보냈습니다. 메일함에서 링크를 눌러 주세요.
            </p>
          )}
          <button type="submit" className="btn-primary mt-5 h-11 w-full justify-center">
            로그인 링크 받기
          </button>
        </form>
      </div>
    </section>
  );
}
