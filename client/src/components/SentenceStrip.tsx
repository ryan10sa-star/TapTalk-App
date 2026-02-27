import { X, Volume2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SentenceStripProps {
  words: string[];
  onRemoveWord: (index: number) => void;
  onClear: () => void;
  onSpeak: () => void;
}

export function SentenceStrip({ words, onRemoveWord, onClear, onSpeak }: SentenceStripProps) {
  return (
    <div
      data-testid="sentence-strip"
      className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white dark:bg-slate-900"
      style={{
        borderColor: "#CBD5E1",
        minHeight: "52px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex-1 flex items-center gap-1.5 flex-wrap min-h-[36px] overflow-hidden">
        {words.length === 0 ? (
          <span className="text-sm text-muted-foreground italic select-none">
            Tap tiles to build a sentence...
          </span>
        ) : (
          words.map((word, i) => (
            <button
              key={i}
              data-testid={`sentence-word-${i}`}
              onClick={() => onRemoveWord(i)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all duration-100 active:scale-95 hover:bg-red-50 hover:border-red-200 hover:text-red-600 group"
              aria-label={`Remove ${word}`}
            >
              {word}
              <X size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={onSpeak}
          disabled={words.length === 0}
          data-testid="button-speak"
          className="h-9 w-9"
          aria-label="Speak sentence"
        >
          <Volume2 size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          disabled={words.length === 0}
          data-testid="button-clear-sentence"
          className="h-9 w-9"
          aria-label="Clear sentence"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
