"use client";

import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";

const SLOT_IDS = {
  main: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MAIN,
  listBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIST_BOTTOM,
  detailBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_BOTTOM,
} as const;

type AdSlotPlacement = keyof typeof SLOT_IDS;

interface AdSlotProps {
  readonly placement: AdSlotPlacement;
  readonly className?: string;
  readonly label?: string;
  readonly minHeightClassName?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function AdSlot({
  placement,
  className,
  label = "광고 영역",
  minHeightClassName = "min-h-[112px]",
}: AdSlotProps) {
  const id = useId();
  const slotId = SLOT_IDS[placement];

  useEffect(() => {
    if (!slotId || !ADSENSE_CLIENT) return;
    window.adsbygoogle = window.adsbygoogle ?? [];
    try {
      window.adsbygoogle.push({});
    } catch (error) {
      if (error instanceof Error && process.env.NODE_ENV !== "production") {
        console.warn(`[AdSlot:${placement}] ${error.message}`);
        return;
      }
      throw error;
    }
  }, [placement, slotId]);

  if (!slotId || !ADSENSE_CLIENT) {
    return (
      <section
        aria-label={label}
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center",
          minHeightClassName,
          className
        )}
      >
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
            AdSense
          </p>
          <p className="mt-1 text-sm font-black text-zinc-700">{label}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            슬롯 환경변수 설정 후 실제 광고가 표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={label}
      className={cn("overflow-hidden rounded-lg bg-white", minHeightClassName, className)}
    >
      <ins
        key={`${id}-${slotId}`}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
