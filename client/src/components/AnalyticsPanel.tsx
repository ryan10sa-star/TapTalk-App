import { useState, useEffect } from "react";
import { X, BarChart2, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllTaps, clearAllTaps, type TapEvent } from "@/lib/indexeddb";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsPanelProps {
  onClose: () => void;
}

export function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const [taps, setTaps] = useState<TapEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTaps().then((data) => {
      setTaps(data.reverse());
      setLoading(false);
    });
  }, []);

  const wordCounts = taps.reduce<Record<string, number>>((acc, t) => {
    acc[t.word] = (acc[t.word] ?? 0) + 1;
    return acc;
  }, {});

  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const maxCount = topWords[0]?.[1] ?? 1;

  const handleClear = async () => {
    await clearAllTaps();
    setTaps([]);
  };

  const handleExport = () => {
    const csv = ["timestamp,word,category,sessionId",
      ...taps.map(t =>
        `${new Date(t.timestamp).toISOString()},${t.word},${t.category},${t.sessionId}`
      )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taptalk-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      data-testid="analytics-panel"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-blue-600" />
            <h2 className="font-bold text-lg">Anderson-OS Analytics</h2>
          </div>
          <button onClick={onClose} data-testid="button-close-analytics" className="p-1 rounded-lg hover-elevate">
            <X size={20} />
          </button>
        </div>

        <ScrollArea className="flex-1 px-5 py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading data...</div>
          ) : taps.length === 0 ? (
            <div className="text-center py-12">
              <BarChart2 size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No tap data yet. Start using TapTalk!</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EFF6FF" }}>
                  <div className="text-2xl font-bold text-blue-700">{taps.length}</div>
                  <div className="text-xs text-blue-600 font-medium mt-0.5">Total Taps</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#F0FDF4" }}>
                  <div className="text-2xl font-bold text-green-700">{Object.keys(wordCounts).length}</div>
                  <div className="text-xs text-green-600 font-medium mt-0.5">Unique Words</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FEF3C7" }}>
                  <div className="text-2xl font-bold text-amber-700">{topWords[0]?.[0] ?? "—"}</div>
                  <div className="text-xs text-amber-600 font-medium mt-0.5">Top Word</div>
                </div>
              </div>

              {topWords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Most Used Words</h3>
                  <div className="space-y-2">
                    {topWords.map(([word, count]) => (
                      <div key={word} className="flex items-center gap-3">
                        <div className="w-20 text-sm font-semibold text-right shrink-0">{word}</div>
                        <div className="flex-1 h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-md transition-all duration-500"
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              backgroundColor: "#2563EB",
                              opacity: 0.7 + (count / maxCount) * 0.3,
                            }}
                          />
                        </div>
                        <div className="w-8 text-sm font-bold text-slate-600 dark:text-slate-300">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
                <div className="space-y-1.5">
                  {taps.slice(0, 20).map((tap, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium">{tap.word}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(tap.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t dark:border-slate-700">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={taps.length === 0}
            data-testid="button-clear-analytics"
          >
            <Trash2 size={14} className="mr-1.5" />
            Clear Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={taps.length === 0}
            data-testid="button-export-analytics"
          >
            <Download size={14} className="mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
