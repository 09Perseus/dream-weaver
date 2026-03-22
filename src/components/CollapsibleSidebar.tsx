import { useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CollapsibleSidebarProps {
  children: ReactNode;
  side: "left" | "right";
  width?: number;
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export default function CollapsibleSidebar({
  children,
  side,
  width = 320,
  collapsed,
  onToggle,
  className = "",
}: CollapsibleSidebarProps) {
  return (
    <div className={`relative ${className}`} style={{ flexShrink: 0 }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-pointer"
        style={{
          [side === "right" ? "left" : "right"]: "-16px",
          width: "16px",
          height: "48px",
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))",
          borderRadius: side === "right" ? "4px 0 0 4px" : "0 4px 4px 0",
          color: "hsl(var(--text-muted))",
          fontSize: "0.7rem",
        }}
      >
        {side === "right"
          ? (collapsed ? "‹" : "›")
          : (collapsed ? "›" : "‹")}
      </button>

      {/* Sidebar body */}
      <div
        style={{
          width: collapsed ? "0px" : `${width}px`,
          minWidth: collapsed ? "0px" : `${width}px`,
          transition: "width 300ms ease, min-width 300ms ease",
          overflow: "hidden",
          borderLeft: side === "right" ? (collapsed ? "none" : "1px solid hsl(var(--border))") : undefined,
          borderRight: side === "left" ? (collapsed ? "none" : "1px solid hsl(var(--border))") : undefined,
          background: "hsl(var(--surface))",
          height: "100%",
        }}
      >
        <div
          style={{
            width: `${width}px`,
            height: "100%",
            overflowY: "auto",
            opacity: collapsed ? 0 : 1,
            transition: "opacity 200ms ease",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function useCollapsibleSidebar(defaultCollapsed?: boolean) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(
    defaultCollapsed ?? (typeof window !== "undefined" && window.innerWidth < 768)
  );
  const toggle = () => setCollapsed((prev) => !prev);
  return { collapsed, toggle, isMobile };
}
