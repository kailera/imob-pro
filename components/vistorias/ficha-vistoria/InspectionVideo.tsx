"use client";

import { useEffect, useState } from "react";
import { getOptimizedVideoUrl } from "@/lib/vistorias/videoMedia";

interface InspectionVideoProps {
  src: string;
  className?: string;
}

export function InspectionVideo({ src, className }: InspectionVideoProps) {
  const optimizedUrl = getOptimizedVideoUrl(src);
  const [failedOptimizedUrl, setFailedOptimizedUrl] = useState<string | null>(null);
  const playbackUrl = optimizedUrl && failedOptimizedUrl !== optimizedUrl ? optimizedUrl : src;

  useEffect(() => {
    if (!failedOptimizedUrl) return;

    const retryTimer = window.setTimeout(() => setFailedOptimizedUrl(null), 10_000);
    return () => window.clearTimeout(retryTimer);
  }, [failedOptimizedUrl]);

  const isUsingTemporaryOriginal = Boolean(optimizedUrl) && playbackUrl === src;

  return (
    <div className="relative h-full w-full">
      <video
        src={playbackUrl}
        controls
        preload="metadata"
        className={className}
        onError={() => {
          if (optimizedUrl && playbackUrl === optimizedUrl) setFailedOptimizedUrl(optimizedUrl);
        }}
      />
      {isUsingTemporaryOriginal && (
        <div className="pointer-events-none absolute left-1 top-1 z-10 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          Otimizando
        </div>
      )}
    </div>
  );
}
