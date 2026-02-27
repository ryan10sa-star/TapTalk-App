import { useState, useCallback } from "react";
import { ImageOff } from "lucide-react";

interface AACTileProps {
  word: string;
  category: string;
  color: string;
  onTap: (word: string, category: string) => void;
  size?: "normal" | "large";
}

const categoryIconMap: Record<string, string> = {
  core: "⬡",
  actions: "▶",
  feelings: "♥",
  food: "◉",
  "lake-county": "◈",
  people: "◎",
  places: "◆",
  things: "◇",
  descriptors: "◐",
  numbers: "#",
  social: "◑",
  animals: "◕",
  routines: "◷",
  activities: "◉",
  nature: "◈",
};

export function AACTile({ word, category, color, onTap, size = "normal" }: AACTileProps) {
  const [pressed, setPressed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
  const imgSrc = `/aac-images/${fileName}.png`;

  const handleTap = useCallback(() => {
    setPressed(true);
    onTap(word, category);
    setTimeout(() => setPressed(false), 200);
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
      data-testid={`tile-${fileName}`}
      onClick={handleTap}
      className="aac-tile group relative flex flex-col items-center justify-between w-full select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        border: "2px solid",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.12s ease",
        boxShadow: pressed
          ? `0 1px 4px ${color}33`
          : `0 2px 8px ${color}22, 0 0 0 0 ${color}00`,
        aspectRatio: "1 / 1",
        minHeight: size === "large" ? "120px" : "80px",
        padding: "8px 6px 6px",
      }}
      aria-label={word}
    >
      <div
        className="flex-1 w-full flex items-center justify-center rounded-lg overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <ImageOff size={20} color={color} />
              </div>
            )}
            <img
              src={imgSrc}
              alt={word}
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
          fontSize: size === "large" ? "clamp(0.65rem, 1.5vw, 0.9rem)" : "clamp(0.55rem, 1.2vw, 0.78rem)",
          lineHeight: 1.2,
          wordBreak: "break-word",
          hyphens: "auto",
        }}
      >
        {word}
      </div>

      <div
        className="absolute inset-0 rounded-xl opacity-0 group-active:opacity-100 transition-opacity duration-75 pointer-events-none"
        style={{ backgroundColor: color, opacity: pressed ? 0.08 : 0 }}
      />
    </button>
  );
}
