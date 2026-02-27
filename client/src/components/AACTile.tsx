import { useState, useCallback, useRef, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface AACTileProps {
  word: string;
  category: string;
  color: string;
  onTap: (word: string, category: string) => void;
  size?: "normal" | "large";
}

export function AACTile({ word, category, color, onTap, size = "normal" }: AACTileProps) {
  const [animating, setAnimating] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgRevealed, setImgRevealed] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
  const imgSrc = `/aac-images/${fileName}.png`;

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImgRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleTap = useCallback(() => {
    if (animTimer.current) clearTimeout(animTimer.current);
    setAnimating(false);
    requestAnimationFrame(() => {
      setAnimating(true);
      animTimer.current = setTimeout(() => setAnimating(false), 340);
    });
    onTap(word, category);
  }, [word, category, onTap]);

  const lightenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  };

  const bgColor = lightenColor(color, 220);
  const borderColor = lightenColor(color, 160);

  return (
    <button
      ref={buttonRef}
      data-testid={`tile-${fileName}`}
      onClick={handleTap}
      className={`aac-tile group relative flex flex-col items-center justify-between w-full select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl${animating ? " tile-spring-tap" : ""}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        border: "2px solid",
        boxShadow: `0 2px 8px ${color}22`,
        aspectRatio: "1 / 1",
        minHeight: size === "large" ? "clamp(80px, 14vw, 140px)" : "clamp(64px, 10vw, 110px)",
        padding: "clamp(4px, 1vw, 10px) clamp(4px, 0.8vw, 8px) clamp(4px, 0.8vw, 8px)",
      }}
      aria-label={word}
    >
      <div
        className="flex-1 w-full flex items-center justify-center rounded-lg overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {!imgRevealed ? (
          <div
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: borderColor, opacity: 0.4 }}
          />
        ) : !imgError ? (
          <>
            {!imgLoaded && (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <ImageOff size={20} color={color} />
              </div>
            )}
            <img
              src={imgSrc}
              alt={word}
              loading="lazy"
              className={`w-full h-full object-contain transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0 absolute"}`}
              style={{ maxHeight: "100%" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              draggable={false}
            />
          </>
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ color, opacity: 0.4 }}
          >
            <ImageOff size={size === "large" ? 28 : 22} />
          </div>
        )}
      </div>

      <div
        className="w-full mt-1 text-center font-semibold leading-tight"
        style={{
          color: color,
          fontSize: size === "large"
            ? "clamp(0.6rem, 1.4vw, 0.88rem)"
            : "clamp(0.5rem, 1.1vw, 0.75rem)",
          lineHeight: 1.2,
          wordBreak: "break-word",
          hyphens: "auto",
        }}
      >
        {word}
      </div>

      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-75"
        style={{ backgroundColor: color, opacity: animating ? 0.07 : 0 }}
      />
    </button>
  );
}
