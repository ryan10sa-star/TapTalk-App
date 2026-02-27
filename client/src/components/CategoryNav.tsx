import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: "all",          label: "All Words",   color: "#475569", icon: "⊞" },
  { id: "recents",      label: "Recents",     color: "#D97706", icon: "⏱" },
  { id: "core",         label: "Core",        color: "#2563EB", icon: "★" },
  { id: "social",       label: "Social",      color: "#E11D48", icon: "◎" },
  { id: "actions",      label: "Actions",     color: "#EA580C", icon: "▶" },
  { id: "feelings",     label: "Feelings",    color: "#7C3AED", icon: "♥" },
  { id: "food",         label: "Food",        color: "#059669", icon: "◉" },
  { id: "lake-county",  label: "Community",   color: "#92400E", icon: "◈" },
  { id: "school",       label: "School",      color: "#6D28D9", icon: "✏" },
  { id: "people",       label: "People",      color: "#DB2777", icon: "◎" },
  { id: "places",       label: "Places",      color: "#0891B2", icon: "◆" },
  { id: "things",       label: "Things",      color: "#CA8A04", icon: "◇" },
  { id: "descriptors",  label: "Descriptors", color: "#6366F1", icon: "◐" },
  { id: "numbers",      label: "Numbers",     color: "#0F766E", icon: "#" },
  { id: "animals",      label: "Animals",     color: "#65A30D", icon: "◕" },
  { id: "routines",     label: "Routines",    color: "#7C3AED", icon: "◷" },
  { id: "activities",   label: "Activities",  color: "#0284C7", icon: "◉" },
  { id: "nature",       label: "Nature",      color: "#059669", icon: "◈" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

interface CategoryNavProps {
  selected: string;
  onSelect: (id: string) => void;
  wordCounts: Record<string, number>;
}

export function CategoryNav({ selected, onSelect, wordCounts }: CategoryNavProps) {
  return (
    <div className="w-full" data-testid="category-nav">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 pb-2 px-0.5" style={{ minWidth: "max-content" }}>
          {CATEGORIES.map((cat) => {
            const isActive = selected === cat.id;
            const count = cat.id === "all"
              ? Object.entries(wordCounts).filter(([k]) => k !== "recents").reduce((a, [, b]) => a + b, 0)
              : (wordCounts[cat.id] ?? 0);

            if (cat.id === "recents" && count === 0) return null;

            return (
              <button
                key={cat.id}
                data-testid={`category-${cat.id}`}
                onClick={() => onSelect(cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 focus:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: isActive ? cat.color : "transparent",
                  color: isActive ? "white" : cat.color,
                  border: `2px solid ${isActive ? cat.color : cat.color + "55"}`,
                  transform: isActive ? "scale(1.03)" : "scale(1)",
                  boxShadow: isActive ? `0 2px 10px ${cat.color}44` : "none",
                }}
                aria-pressed={isActive}
                aria-label={`${cat.label} category`}
              >
                <span className="text-xs leading-none">{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className="text-xs leading-none px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.25)" : cat.color + "22",
                      color: isActive ? "white" : cat.color,
                      fontSize: "0.65rem",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
