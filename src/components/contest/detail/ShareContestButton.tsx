"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

type ShareStatus = "idle" | "copied" | "failed";

interface ShareContestButtonProps {
  readonly title: string;
}

export function ShareContestButton({ title }: ShareContestButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function handleShare(): Promise<void> {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("copied");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        return;
      }
      setStatus("failed");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof Error) {
        setStatus("failed");
        return;
      }
      throw error;
    }
  }

  const label = status === "copied" ? "공유 완료" : status === "failed" ? "공유 불가" : "공유";
  const Icon = status === "copied" ? Check : Share2;

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition-colors hover:border-amber-300 hover:text-amber-800"
      onClick={() => {
        void handleShare();
      }}
      aria-label={`${title} 공유`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
