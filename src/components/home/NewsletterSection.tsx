"use client";

import { FormEvent, useState } from "react";
import { Bell, Send } from "lucide-react";

export function NewsletterSection() {
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const nickname = String(formData.get("nickname") ?? "").trim();
    const privacy = formData.get("privacy") === "on";
    const marketing = formData.get("marketing") === "on";

    if (!email || !nickname || !privacy || !marketing) {
      setMessage("이메일, 닉네임, 필수 동의를 모두 확인해주세요.");
      return;
    }

    setMessage("주간 공모전 브리핑 구독 신청이 기록되었습니다. 실제 발송 기능은 준비 중입니다.");
  }

  return (
    <section id="newsletter" className="py-10">
      <div className="grid gap-6 rounded-lg border border-amber-200 bg-[#ffe84a] p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-amber-200">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-black text-zinc-800">매주 월요일 오전에 챙겨드리는 공모전 알림</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-zinc-950">
            주간 공모전 브리핑 받기
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-800">
            새로 올라온 공모전, 마감 임박 공고, 준비 가이드를 한 번에 받아보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-black text-zinc-800">이메일</span>
            <input name="email" type="email" required className="h-11 border-0 border-b border-zinc-800 bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-600" placeholder="you@example.com" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-black text-zinc-800">닉네임</span>
            <input name="nickname" type="text" required className="h-11 border-0 border-b border-zinc-800 bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-600" placeholder="공모전 준비생" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <input name="privacy" type="checkbox" required className="h-4 w-4 accent-zinc-950" />
            개인정보 수집 및 이용 동의
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <input name="marketing" type="checkbox" required className="h-4 w-4 accent-zinc-950" />
            광고성 정보 수신 동의
          </label>
          <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-black text-white shadow-card transition-colors hover:bg-zinc-800">
            <Send className="h-4 w-4" aria-hidden="true" />
            공모전 브리핑 구독하기
          </button>
          {message && <p className="text-sm font-bold text-zinc-900">{message}</p>}
        </form>
      </div>
    </section>
  );
}
