"use client";

import React, { useState } from "react";
import Image from "next/image";
import { mediaUrl } from "@/lib/api";

type FlyerImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Fixed height strip (cards) */
  height?: number;
  /** Contain mode for detail/admin previews */
  contain?: boolean;
  priority?: boolean;
};

function resolveSrc(src?: string | null): string | null {
  if (!src) return null;
  return mediaUrl(src) || src;
}

export function FlyerImage({
  src,
  alt,
  className = "",
  height = 112,
  contain = false,
  priority = false,
}: FlyerImageProps) {
  const resolved = resolveSrc(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) return null;

  if (contain) {
    return (
      <div className={`relative w-full bg-np-bg ${className}`} style={{ minHeight: 160, maxHeight: 500 }}>
        <Image
          src={resolved}
          alt={alt}
          width={1200}
          height={800}
          className="w-full max-h-[500px] h-auto object-contain"
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority={priority}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-np-surface-2 ${className}`} style={{ height }}>
      <Image
        src={resolved}
        alt={alt}
        fill
        className="object-cover object-center opacity-90 group-hover:opacity-100 transition-opacity"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
