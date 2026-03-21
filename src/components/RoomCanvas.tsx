import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

interface RoomCanvasProps {
  className?: string;
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
}

export default function RoomCanvas({ className = "" }: RoomCanvasProps) {
  return (
    <div
      id="room-canvas"
      className={`room-canvas bg-surface rounded-lg border border-border/50 flex items-center justify-center ${className}`}
    >
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto">
          <svg className="h-8 w-8 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">3D Canvas — Three.js will render here</p>
      </div>
    </div>
  );
}
