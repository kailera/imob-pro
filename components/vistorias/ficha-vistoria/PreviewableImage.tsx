"use client";

import React, { useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface PreviewableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function PreviewableImage({ src, alt, className = "" }: PreviewableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="group relative block h-full w-full overflow-hidden text-left" aria-label={`Ampliar ${alt}`}>
        <img src={src} alt={alt} className={className} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 print:hidden" role="dialog" aria-modal="true" aria-label={`Visualização de ${alt}`} onClick={() => setIsOpen(false)}>
          <button type="button" onClick={() => setIsOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Fechar visualização">
            <X className="h-6 w-6" />
          </button>
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}
