import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AACTile } from "@/components/AACTile";
import { SentenceStrip } from "@/components/SentenceStrip";
import { CategoryNav, CATEGORIES } from "@/components/CategoryNav";
import { PartnerModeLock } from "@/components/PartnerModeLock";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { speakWord, preloadAudio } from "@/lib/audio";
import { logTap } from "@/lib/indexeddb";
import { BarChart2, Search, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VocabWord {
  id: number;
  word: string;
  category: string;
  color: string;
}

export default function Home() {
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [locked, setLocked] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/vocabulary.json")
      .then((r) => r.json())
      .then((data: VocabWord[]) => {
        setVocabulary(data);
        const firstBatch = data.slice(0, 40).map((w) => w.word);
        preloadAudio(firstBatch);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (!locked) {
      const words = displayedWords.map((w) => w.word);
      preloadAudio(words);
    }
  }, [selectedCategory, locked]);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const wordCounts = useMemo(() => {
    return vocabulary.reduce<Record<string, number>>((acc, w) => {
      acc[w.category] = (acc[w.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [vocabulary]);

  const displayedWords = useMemo(() => {
    let words = vocabulary;
    if (selectedCategory !== "all") {
      words = words.filter((w) => w.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      words = words.filter((w) => w.word.toLowerCase().includes(q));
    }
    return words;
  }, [vocabulary, selectedCategory, searchQuery]);

  const handleTap = useCallback(
    (word: string, category: string) => {
      speakWord(word);
      logTap(word, category);
      setSentenceWords((prev) => [...prev, word]);
    },
    []
  );

  const handleSpeakSentence = useCallback(() => {
    if (sentenceWords.length === 0) return;
    const sentence = sentenceWords.join(" ");
    speakWord(sentence);
  }, [sentenceWords]);

  const handleRemoveWord = useCallback((index: number) => {
    setSentenceWords((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearSentence = useCallback(() => {
    setSentenceWords([]);
  }, []);

  const handleCategorySelect = useCallback((id: string) => {
    if (locked) return;
    setSelectedCategory(id);
    setSearchQuery("");
    setShowSearch(false);
  }, [locked]);

  const toggleLock = useCallback(() => {
    setLocked((prev) => !prev);
  }, []);

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  const gridCols = useMemo(() => {
    const count = displayedWords.length;
    if (count <= 6) return "grid-cols-3 sm:grid-cols-4 md:grid-cols-6";
    if (count <= 12) return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8";
    return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12";
  }, [displayedWords.length]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950"
      data-testid="home-page"
    >
      <header
        className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b bg-white dark:bg-slate-900"
        style={{ borderColor: "#E2E8F0" }}
      >
        <div className="flex items-center gap-2 mr-auto">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg font-black text-white text-sm"
            style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
          >
            TT
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">TapTalk AAC</div>
            <div className="text-xs text-muted-foreground leading-tight">Lake County Edition</div>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 ${locked ? "opacity-40 pointer-events-none" : ""}`}>
          {showSearch ? (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search words..."
                  data-testid="input-search"
                  className="h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 w-40 sm:w-52"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                data-testid="button-close-search"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowSearch(true)}
              data-testid="button-open-search"
              aria-label="Search words"
            >
              <Search size={16} />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAnalytics(true)}
            data-testid="button-analytics"
            aria-label="View analytics"
          >
            <BarChart2 size={16} />
          </Button>
        </div>

        <PartnerModeLock locked={locked} onToggle={toggleLock} />
      </header>

      {locked && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "#EF4444" }}
          data-testid="partner-mode-banner"
        >
          <Volume2 size={15} />
          Partner Mode Active — Hold lock button for 3 seconds to unlock
        </div>
      )}

      <div className="shrink-0 px-3 pt-2.5">
        <SentenceStrip
          words={sentenceWords}
          onRemoveWord={handleRemoveWord}
          onClear={handleClearSentence}
          onSpeak={handleSpeakSentence}
        />
      </div>

      <div className={`shrink-0 px-3 pt-2 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
        <CategoryNav
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          wordCounts={wordCounts}
        />
      </div>

      {searchQuery && (
        <div className="shrink-0 px-3 pt-1">
          <div className="text-xs text-muted-foreground">
            {displayedWords.length} result{displayedWords.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
          </div>
        </div>
      )}

      <main
        className="flex-1 overflow-y-auto px-3 pb-3 pt-2"
        data-testid="tile-grid"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {vocabulary.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-30">⬡</div>
              <p className="text-muted-foreground">Loading vocabulary...</p>
            </div>
          </div>
        ) : displayedWords.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <Search size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">No words found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-2 sm:gap-2.5 ${gridCols}`}
            style={{ alignContent: "start" }}
          >
            {displayedWords.map((vocab) => (
              <AACTile
                key={vocab.id}
                word={vocab.word}
                category={vocab.category}
                color={vocab.color}
                onTap={handleTap}
              />
            ))}
          </div>
        )}
      </main>

      {showAnalytics && (
        <AnalyticsPanel onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
