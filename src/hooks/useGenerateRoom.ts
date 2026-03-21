import { useState, useCallback } from "react";
import { generateRoom } from "@/lib/edgeFunctions";
import type { FurnitureDetail } from "@/lib/edgeFunctions";
import type { FurnitureItem } from "@/components/RoomCanvas";

const LOADING_MESSAGES = [
  "Analyzing your description…",
  "Selecting furniture pieces…",
  "Arranging the room layout…",
  "Placing items in the scene…",
  "Almost there…",
];

// Map category to a reasonable display size (metres)
export function getDisplaySize(category: string): number {
  const cat = category.toLowerCase();
  if (cat.includes("bed")) return 2.2;
  if (cat.includes("sofa")) return 2.0;
  if (cat.includes("table")) return 1.2;
  if (cat.includes("chair")) return 0.9;
  if (cat.includes("lamp")) return 1.0;
  if (cat.includes("plant")) return 0.8;
  if (cat.includes("rug") || cat.includes("carpet") || cat.includes("mat")) return 2.5;
  if (cat.includes("shelf")) return 1.4;
  return 1.0;
}

interface UseGenerateRoomOptions {
  roomSize: number;
  roomHeight: number;
}

export function useGenerateRoom({ roomSize, roomHeight }: UseGenerateRoomOptions) {
  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([]);
  const [furnitureDetails, setFurnitureDetails] = useState<FurnitureDetail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (description: string) => {
    if (!description.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setFurnitures([]);
    setFurnitureDetails([]);

    // Cycle through loading messages
    let msgIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, LOADING_MESSAGES.length - 1);
      setLoadingMessage(LOADING_MESSAGES[msgIndex]);
    }, 3000);

    try {
      const response = await generateRoom(description);
      const { items, furniture } = response;

      // Build a lookup from furniture details
      const detailMap = new Map<string, FurnitureDetail>();
      furniture.forEach((f) => detailMap.set(f.id, f));

      // Map placed items to FurnitureItem[] for the canvas
      const mapped: FurnitureItem[] = items.map((item) => {
        const detail = detailMap.get(item.id);
        // Try to find the local GLB path from the furniture-list.json name match
        const filePath = detail?.file_url ?? undefined;
        const displaySize = detail ? getDisplaySize(detail.category) : 1;

        return {
          id: `${item.id}_${Math.random().toString(36).slice(2, 6)}`,
          position: [item.x, 0, item.z] as [number, number, number],
          rotation: [0, (item.rotation * Math.PI) / 180, 0] as [number, number, number],
          path: filePath || undefined,
          displaySize,
        };
      });

      setFurnitures(mapped);
      setFurnitureDetails(furniture);
    } catch (err) {
      console.error("Room generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate room");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
      setLoadingMessage("");
    }
  }, [isGenerating]);

  return {
    furnitures,
    setFurnitures,
    furnitureDetails,
    isGenerating,
    loadingMessage,
    error,
    generate,
  };
}
