"use client";

import Image from "next/image";
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FallbackImageProps {
  readonly src?: string | null;
  readonly alt: string;
  readonly sizes: string;
  readonly className?: string;
  readonly imageClassName?: string;
  readonly priority?: boolean;
}

export function FallbackImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  priority = false,
}: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : null;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-stone-100", className)}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          quality={60}
          priority={priority}
          className={cn("object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400">
          <ImageIcon className="h-8 w-8" aria-hidden="true" />
          <span className="text-xs font-bold text-stone-500">이미지 준비 중</span>
        </div>
      )}
    </div>
  );
}
