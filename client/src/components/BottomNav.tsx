import { Link, useLocation } from "wouter";
import { LayoutGrid, Columns2, Star, CalendarDays } from "lucide-react";
import { usePartner } from "@/lib/partnerContext";

const NAV_ITEMS = [
  { path: "/", label: "AAC Board", icon: LayoutGrid },
  { path: "/choice-board", label: "Choice Board", icon: Columns2 },
  { path: "/token-board", label: "Token Board", icon: Star },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
];

export function BottomNav() {
  const [location] = useLocation();
  const { locked } = usePartner();

  return (
    <nav
      className="shrink-0 flex items-stretch border-t bg-white dark:bg-slate-900"
      style={{ borderColor: "#E2E8F0" }}
      data-testid="bottom-nav"
    >
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
        const isActive = location === path;
        const isDisabled = locked && path !== location;

        return (
          <Link
            key={path}
            href={isDisabled ? location : path}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors duration-100 focus:outline-none focus-visible:ring-2 relative"
            style={{
              color: isActive ? "#2563EB" : isDisabled ? "#CBD5E1" : "#64748B",
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.5 : 1,
            }}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: "#2563EB" }}
              />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-xs font-semibold leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
