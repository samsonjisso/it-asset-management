"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, X } from "lucide-react";

interface ZoomImageProps {
  src: string;
  alt?: string;
  /** Base thumbnail size in px (square). Default 160 — large enough to
   *  actually see, unlike the old 80px "Photo" preview. The full image
   *  is always shown uncropped inside this box (letterboxed, not
   *  cropped), so nothing important gets cut off. */
  size?: number;
  /** Size of the floating zoomed preview shown on hover. */
  previewSize?: number;
  className?: string;
}

// Shows a photo uncropped at a decent default size (object-contain, so the
// whole image is always visible instead of being cropped to fill a square
// like the old object-cover thumbnail). On hover it floats a larger
// scrollable preview next to it, and on click it opens a full-screen
// lightbox with the image at its true size inside a scrollable frame —
// so even a very large or oddly-shaped photo can be viewed in full by
// scrolling, rather than being squeezed down or cut off.
// Used anywhere a device/PC/server registration photo is shown after saving.
export function ZoomImage({
  src,
  alt = "",
  size = 160,
  previewSize = 420,
  className = "",
}: ZoomImageProps) {
  const [hovering, setHovering] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const handleEnter = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    let left = rect.right + margin;
    let top = rect.top + rect.height / 2 - previewSize / 2;
    if (left + previewSize > window.innerWidth - margin)
      left = rect.left - previewSize - margin;
    if (left < margin)
      left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - previewSize - margin),
      );
    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - previewSize - margin),
    );
    setCoords({ top, left });
    setHovering(true);
  };

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovering(false)}
        onClick={() => setLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={alt ? `View full image: ${alt}` : "View full image"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
        className={`relative shrink-0 rounded-lg border border-brand-600 overflow-hidden cursor-zoom-in bg-gray-50 dark:bg-gray-900 group ${className}`}
        style={{ width: size, height: size }}
      >
        {/* object-contain (not cover) so the entire photo is always visible, never cropped */}
        <img src={src} alt={alt} className="w-full h-full object-contain" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
          <div className="bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={16} />
          </div>
        </div>
      </div>

      {hovering && !lightboxOpen && (
        <div
          className="fixed z-[70] rounded-xl shadow-2xl ring-1 ring-black/10 border-2 border-brand-600 overflow-auto bg-white dark:bg-gray-900 gbb-pop-in"
          style={{
            top: coords.top,
            left: coords.left,
            width: previewSize,
            maxHeight: previewSize,
          }}
        >
          {/* Scrollable so a tall/wide image is still viewable in full instead of being squeezed to fit */}
          <img src={src} alt={alt} className="w-full h-auto block" />
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 sm:p-8 gbb-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={22} />
          </button>
          <div
            className="max-w-[92vw] max-h-[88vh] overflow-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full, true-size image — scrolls within the frame instead of being shrunk, so nothing is lost */}
            <img src={src} alt={alt} className="block max-w-none mx-auto" />
          </div>
        </div>
      )}
    </>
  );
}
