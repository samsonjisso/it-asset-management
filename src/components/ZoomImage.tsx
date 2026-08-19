import { useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';

interface ZoomImageProps {
  src: string;
  alt?: string;
  /** Base thumbnail size in px (square). Default 128 — large enough to
   *  actually see, unlike the old 80px "Photo" preview. */
  size?: number;
  /** Size of the floating zoomed preview shown on hover. */
  previewSize?: number;
  className?: string;
}

// Shows a photo at a decent default size, and on hover floats a much
// larger preview next to it (fixed-positioned so it always stays fully
// on-screen and isn't clipped by a scrolling modal). Used anywhere a
// device/PC/server registration photo is shown after saving.
export function ZoomImage({ src, alt = '', size = 128, previewSize = 360, className = '' }: ZoomImageProps) {
  const [hovering, setHovering] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    let left = rect.right + margin;
    let top = rect.top + rect.height / 2 - previewSize / 2;
    if (left + previewSize > window.innerWidth - margin) left = rect.left - previewSize - margin;
    if (left < margin) left = Math.max(margin, Math.min(rect.left, window.innerWidth - previewSize - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - previewSize - margin));
    setCoords({ top, left });
    setHovering(true);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovering(false)}
      className={`relative shrink-0 rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in bg-gray-50 group ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
        <div className="bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={16} />
        </div>
      </div>
      {hovering && (
        <div
          className="fixed z-[70] rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden bg-white pointer-events-none gbb-pop-in"
          style={{ top: coords.top, left: coords.left, width: previewSize, height: previewSize }}
        >
          <img src={src} alt={alt} className="w-full h-full object-contain bg-gray-50" />
        </div>
      )}
    </div>
  );
}
