import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Undo, Trash2, Share2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { captureRoomThumbnail } from "@/utils/captureRoomThumbnail";
import { bustCache } from "@/utils/imageUrl";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";
import { getItemKey } from "@/lib/edgeFunctions";

interface LocationState {
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
  description?: string;
  floor_texture?: string;
  wall_texture?: string;
}

interface PickerItem {
  id: string;
  name: string;
  category: string;
  price: number;
  thumbnail_url: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  "All": "",
  "Beds": "bed",
  "Sofas": "sofa",
  "Tables": "table",
  "Chairs": "chair",
  "Lamps": "lamp",
  "Plants": "plant",
  "Rugs": "rug",
  "Shelves": "shelf",
};

// ── Item Info Card ────────────────────────────────────────────────────────────
function ItemInfoCard({
  item,
  detail,
  isEditMode,
  onDelete,
  onAddToCart,
  onBack,
  formatPrice,
}: {
  item: PlacedItem;
  detail: FurnitureDetail | undefined;
  isEditMode: boolean;
  onDelete: () => void;
  onAddToCart: () => void;
  onBack: () => void;
  formatPrice: (price: number) => string;
}) {
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="font-body text-[0.75rem] text-muted-foreground
                     hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="font-body text-[0.7rem] tracking-[0.1em] uppercase
                         text-muted-foreground ml-auto">
          {isEditMode ? 'Edit Mode' : 'Item Details'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Image */}
        {detail?.thumbnail_url && detail.thumbnail_url !== "PENDING_UPLOAD" ? (
          <img
            src={bustCache(detail.thumbnail_url)}
            alt={detail.name}
            className="w-full aspect-square object-cover rounded-lg border border-border"
          />
        ) : (
          <div className="w-full aspect-square bg-muted rounded-lg border border-border
                          flex items-center justify-center">
            <span className="text-5xl">🛋️</span>
          </div>
        )}

        {/* Name + description */}
        <div>
          <p className="font-heading text-lg text-foreground">
            {detail?.name ?? item.id}
          </p>
          {detail?.description && (
            <p className="font-body text-[0.75rem] text-muted-foreground mt-1">
              {detail.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between py-3 border-t border-border">
          <span className="font-body text-[0.75rem] text-muted-foreground
                           uppercase tracking-wide">Price</span>
          <span className="font-heading text-xl text-accent">
            {detail ? formatPrice(detail.price) : '—'}
          </span>
        </div>

        {/* Dimensions */}
        {detail && (detail.real_width || detail.real_height || detail.real_depth) && (
          <div className="py-3 border-t border-border space-y-1">
            <span className="font-body text-[0.7rem] text-muted-foreground
                             uppercase tracking-wide">Dimensions</span>
            <p className="font-body text-[0.8rem] text-foreground">
              {detail.real_width?.toFixed(2) ?? '—'}m ×{' '}
              {detail.real_depth?.toFixed(2) ?? '—'}m ×{' '}
              {detail.real_height?.toFixed(2) ?? '—'}m
            </p>
          </div>
        )}

        {/* Edit mode hint */}
        {isEditMode && (
          <div className="py-3 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="font-body text-[0.75rem] text-amber-600 dark:text-amber-400">
              Drag to reposition · Double-click again to exit edit mode
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onAddToCart}
            className="w-full py-2 px-4 bg-accent text-white text-sm
                             font-body rounded-lg hover:opacity-90 transition-opacity">
            Add to Cart
          </button>
          <button
            onClick={onDelete}
            className="w-full py-2 px-4 bg-destructive text-destructive-foreground text-sm
                       font-body rounded-lg hover:opacity-90 transition-opacity"
          >
            Delete from Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Info Card (for picker preview, not placed items) ──────────────────
function PreviewInfoCard({
  item,
  formatPrice,
  onAddToRoom,
  onBack,
}: {
  item: PickerItem & { description?: string | null; real_width?: number | null; real_height?: number | null; real_depth?: number | null; style_tags?: string[] | null };
  formatPrice: (price: number) => string;
  onAddToRoom: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="font-body text-[0.75rem] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground ml-auto">
          Preview
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {item.thumbnail_url ? (
          <img
            src={bustCache(item.thumbnail_url)}
            alt={item.name}
            className={`w-full rounded-lg border border-border ${
              item.category?.toLowerCase() === 'texture'
                ? 'aspect-auto object-contain'
                : 'aspect-square object-cover'
            }`}
          />
        ) : (
          <div className="w-full aspect-square bg-muted rounded-lg border border-border flex items-center justify-center">
            <span className="text-5xl">🛋️</span>
          </div>
        )}
        <div>
          <p className="font-heading text-lg text-foreground">{item.name}</p>
          {item.description && (
            <p className="font-body text-[0.75rem] text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <span className="font-body text-[0.75rem] text-muted-foreground uppercase tracking-wide">Price</span>
          <span className="font-heading text-xl text-accent">{formatPrice(item.price)}</span>
        </div>
        {(item.real_width || item.real_height || item.real_depth) && (
          <div className="py-3 border-t border-border space-y-1">
            <span className="font-body text-[0.7rem] text-muted-foreground uppercase tracking-wide">Dimensions</span>
            <p className="font-body text-[0.8rem] text-foreground">
              {item.real_width?.toFixed(2) ?? '—'}m × {item.real_depth?.toFixed(2) ?? '—'}m × {item.real_height?.toFixed(2) ?? '—'}m
            </p>
          </div>
        )}
        {item.style_tags && item.style_tags.length > 0 && (
          <div className="py-3 border-t border-border space-y-1">
            <span className="font-body text-[0.7rem] text-muted-foreground uppercase tracking-wide">Style</span>
            <div className="flex flex-wrap gap-1">
              {item.style_tags.map((tag) => (
                <span key={tag} className="font-body text-[0.65rem] px-2 py-0.5 border border-border text-muted-foreground rounded-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={onAddToRoom}
          className="w-full py-2 px-4 bg-accent text-white text-sm font-body rounded-lg hover:opacity-90 transition-opacity"
        >
          Add to Room
        </button>
      </div>
    </div>
  );
}

// ── Texture options ───────────────────────────────────────────────────────────
const FLOOR_TEXTURES = [
  { id: "darkoak", label: "Dark Oak", url: "/furnitures/Flooring/darkoak.png" },
  { id: "marble", label: "Marble", url: "/furnitures/Flooring/marble.png" },
  { id: "chess", label: "Chess", url: "/furnitures/Flooring/chess.png" },
  { id: "tatami", label: "Tatami", url: "/furnitures/Flooring/tatami.png" },
];
const WALL_TEXTURES = [
  { id: "japanese_shoji_pattern", label: "Shoji", url: "/furnitures/wallpapers/japanese_shoji_pattern.png" },
  { id: "japanese_bamboo_pattern", label: "Bamboo", url: "/furnitures/wallpapers/japanese_bamboo_pattern.png" },
  { id: "japanese_sakura_pattern", label: "Sakura", url: "/furnitures/wallpapers/japanese_sakura_pattern.png" },
  { id: "japanese_seigaiha_pattern", label: "Seigaiha", url: "/furnitures/wallpapers/japanese_seigaiha_pattern.png" },
];

// ── Right Panel — switches between list, info card, and preview ───────────────
function RightPanel({
  roomItems,
  furniture,
  selectedItemId,
  editingItemId,
  previewItem,
  formatPrice,
  onSelectItem,
  onDeleteItem,
  onAddAnother,
  onAddToCart,
  onAddPreviewToRoom,
  onBack,
  onClearPreview,
  floorTexturePath,
  wallTexturePath,
  onFloorTextureChange,
  onWallTextureChange,
}: {
  roomItems: PlacedItem[];
  furniture: FurnitureDetail[];
  selectedItemId: string | null;
  editingItemId: string | null;
  previewItem: (PickerItem & { description?: string | null; real_width?: number | null; real_height?: number | null; real_depth?: number | null; style_tags?: string[] | null }) | null;
  formatPrice: (price: number) => string;
  onSelectItem: (key: string) => void;
  onDeleteItem: (key: string) => void;
  onAddAnother: (furnitureId: string) => void;
  onAddToCart: (furnitureId: string) => void;
  onAddPreviewToRoom: () => void;
  onBack: () => void;
  onClearPreview: () => void;
}) {
  const selectedItem = roomItems.find((i) => getItemKey(i) === selectedItemId);
  const selectedDetail = selectedItem ? furniture.find((f) => f.id === selectedItem.id) : undefined;

  // Group items by furniture id
  const groupedItems = useMemo(() => {
    const acc: Record<string, { furnitureId: string; instances: PlacedItem[]; detail: FurnitureDetail | undefined }> = {};
    for (const item of roomItems) {
      if (!acc[item.id]) {
        acc[item.id] = {
          furnitureId: item.id,
          instances: [],
          detail: furniture.find((f) => f.id === item.id),
        };
      }
      acc[item.id].instances.push(item);
    }
    return Object.values(acc);
  }, [roomItems, furniture]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {selectedItem ? (
        <ItemInfoCard
          item={selectedItem}
          detail={selectedDetail}
          isEditMode={editingItemId === selectedItemId}
          onDelete={() => onDeleteItem(selectedItemId!)}
          onAddToCart={() => onAddToCart(selectedItem.id)}
          onBack={onBack}
          formatPrice={formatPrice}
        />
      ) : previewItem ? (
        <PreviewInfoCard
          item={previewItem}
          formatPrice={formatPrice}
          onAddToRoom={onAddPreviewToRoom}
          onBack={onClearPreview}
        />
      ) : (
        <>
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="font-body text-[0.7rem] tracking-[0.1em] uppercase
                           text-muted-foreground">
              Room Items ({roomItems.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {roomItems.length === 0 ? (
              <p className="font-body text-[0.75rem] text-muted-foreground
                            text-center py-8 px-4">
                No furniture in this room. Add items from the picker.
              </p>
            ) : (
              groupedItems.map((group) => {
                const hasSelectedInstance = group.instances.some(
                  (i) => getItemKey(i) === selectedItemId
                );
                return (
                  <button
                    key={group.furnitureId}
                    onClick={() => onSelectItem(getItemKey(group.instances[0]))}
                    className={`w-full text-left px-4 py-3 border-b border-border
                                transition-colors cursor-pointer min-h-[44px]
                                ${hasSelectedInstance
                        ? 'bg-accent/10 border-l-2 border-l-accent'
                        : 'hover:bg-background'}`}
                  >
                    <div className="flex items-center gap-3">
                      {group.detail?.thumbnail_url && group.detail.thumbnail_url !== "PENDING_UPLOAD" ? (
                        <img
                          src={bustCache(group.detail.thumbnail_url)}
                          alt={group.detail?.name ?? group.furnitureId}
                          className="h-10 w-10 object-cover flex-shrink-0 rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 border border-border rounded
                                        flex items-center justify-center flex-shrink-0
                                        bg-muted">
                          <span className="text-lg">🛋️</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[0.8rem] text-foreground truncate">
                          {group.detail?.name ?? group.furnitureId}
                        </p>
                        <p className="font-body text-[0.7rem] text-accent">
                          {group.detail ? formatPrice(group.detail.price) : '—'}
                        </p>
                      </div>

                      {/* Quantity badge */}
                      <span className="font-body text-[0.65rem] font-semibold bg-accent text-accent-foreground
                                       px-2 py-0.5 rounded-sm min-w-[28px] text-center shrink-0">
                        ×{group.instances.length}
                      </span>

                      {/* Add one more */}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAnother(group.furnitureId);
                        }}
                        className="h-6 w-6 border border-border rounded flex items-center justify-center
                                   text-muted-foreground hover:text-foreground hover:border-accent
                                   transition-colors cursor-pointer shrink-0 text-base leading-none"
                      >
                        +
                      </span>

                      {/* Remove one */}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const last = group.instances[group.instances.length - 1];
                          onDeleteItem(getItemKey(last));
                        }}
                        className="h-6 w-6 border border-border rounded flex items-center justify-center
                                   text-muted-foreground hover:text-foreground hover:border-destructive
                                   transition-colors cursor-pointer shrink-0 text-base leading-none"
                      >
                        −
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </>
      )}
    </div>
  );
}

// ── EditRoom ──────────────────────────────────────────────────────────────────
export default function EditRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem: addToCart } = useCart();
  const navState = location.state as LocationState | null;
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();

  const [roomItems, setRoomItems] = useState<PlacedItem[]>(navState?.items ?? []);
  const [furniture, setFurniture] = useState<FurnitureDetail[]>(navState?.furniture ?? []);
  const [description, setDescription] = useState(navState?.description ?? "");
  const [loading, setLoading] = useState(!navState?.items);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const lastSavedItems = useRef<PlacedItem[]>(navState?.items ?? []);
  const lastSavedName = useRef(navState?.description || "My Room");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // selectedItemId — right panel shows info card
  // editingItemId  — item is in drag mode (double click in canvas)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<PlacedItem[][]>([]);
  const [pickerItems, setPickerItems] = useState<PickerItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [pickerLoading, setPickerLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [pickerDrawerOpen, setPickerDrawerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<(PickerItem & { description?: string | null; real_width?: number | null; real_height?: number | null; real_depth?: number | null; style_tags?: string[] | null }) | null>(null);
  const [floorTexturePath, setFloorTexturePath] = useState<string | null>(navState?.floor_texture ?? null);
  const [wallTexturePath, setWallTexturePath] = useState<string | null>(navState?.wall_texture ?? null);
  const [roomName, setRoomName] = useState(navState?.description || "My Room");
  const [isEditingName, setIsEditingName] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [rightCollapsed, setRightCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  // Fetch room from DB if no nav state
  useEffect(() => {
    if (navState?.items) return;
    if (!roomId) { setLoading(false); return; }
    const fetchRoom = async () => {
      try {
        const { data: room, error } = await supabase
          .from("room_designs")
          .select("is_copy, user_id, description, items, floor_texture, wall_texture")
          .eq("id", roomId)
          .maybeSingle();
        if (error || !room) { setLoading(false); return; }
        setIsCopy(!!room.is_copy);
        setFloorTexturePath((room as any).floor_texture ?? null);
        setWallTexturePath((room as any).wall_texture ?? null);
        setDescription(room.description ?? "");
        setRoomName(room.description || "My Room");
        const rawItems = (room.items as any as PlacedItem[]) ?? [];
        // Ensure every item has a unique instanceId (older saves may lack one)
        const items = rawItems.map((item) => ({
          ...item,
          instanceId: item.instanceId ?? `${item.id}_${Math.random().toString(36).substr(2, 9)}`,
        }));
        setRoomItems(items);
        lastSavedItems.current = items;
        lastSavedName.current = room.description || "My Room";
        const itemIds = items.map((i) => i.id);
        if (itemIds.length > 0) {
          const { data: fd } = await supabase
            .from("furniture_items")
            .select("*")
            .in("id", itemIds);
          if (fd) setFurniture(fd as unknown as FurnitureDetail[]);
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navState]);

  // Fetch picker items
  useEffect(() => {
    const fetchPicker = async () => {
      const { data, error } = await supabase
        .from("furniture_items")
        .select("id, name, category, price, thumbnail_url")
        .order("name");
      if (!error && data) setPickerItems(data);
      setPickerLoading(false);
    };
    fetchPicker();
  }, []);

  // Check if already posted
  useEffect(() => {
    if (!roomId || !user) return;
    const check = async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id")
        .eq("room_design_id", roomId)
        .eq("user_id", user.id)
        .eq("is_visible", true)
        .maybeSingle();
      if (data) setPosted(true);
    };
    check();
  }, [roomId, user]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => prev.filter((item) => getItemKey(item) !== selectedItemId));
    setSelectedItemId(null);
    setEditingItemId(null);
    toast({ title: "Item removed" });
  }, [selectedItemId, roomItems]);

  // Clear preview when canvas item is selected
  useEffect(() => {
    if (selectedItemId) setPreviewItem(null);
  }, [selectedItemId]);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, handleDeleteSelected]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setRoomItems(undoStack[undoStack.length - 1]);
    setUndoStack((prev) => prev.slice(0, -1));
    setSelectedItemId(null);
    setEditingItemId(null);
    toast({ title: "Undo successful" });
  };

  // ── Autosave logic ──────────────────────────────────────────────────────────
  const performSave = useCallback(async () => {
    if (!roomId) return;
    setSaveStatus("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSaveStatus("unsaved"); return; }
      const { error } = await supabase
        .from("room_designs")
        .update({
          items: roomItems as any,
          description: roomName,
          floor_texture: floorTexturePath,
          wall_texture: wallTexturePath,
        } as any)
        .eq("id", roomId)
        .eq("user_id", session.user.id);
      if (error) {
        console.error("Autosave error:", error);
        setSaveStatus("unsaved");
        return;
      }
      lastSavedItems.current = roomItems;
      lastSavedName.current = roomName;
      setSaveStatus("saved");
      setTimeout(() => { if (roomId) captureRoomThumbnail(roomId); }, 1500);
    } catch {
      setSaveStatus("unsaved");
    }
  }, [roomId, roomItems, roomName, floorTexturePath, wallTexturePath]);

  // Debounced autosave on roomItems, roomName, or texture change
  useEffect(() => {
    const itemsSame = JSON.stringify(roomItems) === JSON.stringify(lastSavedItems.current);
    const nameSame = roomName === lastSavedName.current;
    if (itemsSame && nameSame) return;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { performSave(); }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [roomItems, roomName, performSave]);

  // Trigger save on texture changes
  useEffect(() => {
    if (!roomId) return;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { performSave(); }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [floorTexturePath, wallTexturePath]);

  // Warn on browser close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus !== "saved") { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus]);


  const handleAddFromPicker = async (pickerItem: PickerItem) => {
    const instanceId = `${pickerItem.id}_${Date.now()}`;
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => [
      ...prev,
      { id: pickerItem.id, instanceId, x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    ]);
    setSelectedItemId(instanceId);

    // Fetch full furniture detail (including file_url) from DB
    if (!furniture.find((f) => f.id === pickerItem.id)) {
      const { data: fullDetail } = await supabase
        .from("furniture_items")
        .select("*")
        .eq("id", pickerItem.id)
        .maybeSingle();

      if (fullDetail) {
        setFurniture((prev) => [...prev, fullDetail as unknown as FurnitureDetail]);
      } else {
        // Fallback with picker data if full fetch fails
        setFurniture((prev) => [
          ...prev,
          {
            id: pickerItem.id,
            name: pickerItem.name,
            category: pickerItem.category,
            price: pickerItem.price,
            thumbnail_url: pickerItem.thumbnail_url,
            file_url: null,
            real_width: null,
            real_depth: null,
            real_height: null,
            floor_offset: null,
            style_tags: null,
            buy_url: null,
            description: null,
          },
        ]);
      }
    }
    toast({ title: "Item added", description: "Reposition it in the room." });
  };

  const handleAddToCart = (furnitureId: string) => {
    const detail = furniture.find((f) => f.id === furnitureId);
    addToCart({
      id: furnitureId,
      name: detail?.name ?? furnitureId,
      price: detail?.price ?? 0,
      thumbnailUrl: detail?.thumbnail_url ?? "",
    });
    toast({ title: "Added to cart" });
  };

  const handleAddAnother = (furnitureId: string) => {
    const instanceId = `${furnitureId}_${Date.now()}`;
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => [
      ...prev,
      { id: furnitureId, instanceId, x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    ]);
    setSelectedItemId(instanceId);
    toast({ title: "Item added" });
  };

  const filteredPicker = (
    activeCategory === "All"
      ? pickerItems
      : pickerItems.filter(
        (i) => i.category?.toLowerCase() === CATEGORY_MAP[activeCategory]
      )
  ).filter((i) => i.category?.toLowerCase() !== "texture");

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="h-px w-32 bg-border overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-line-progress" />
        </div>
      </div>
    );
  }

  // Picker content — shared between desktop sidebar and mobile drawer
  const pickerContent = (
    <>
      <div className="flex flex-wrap gap-1 p-3 border-b border-border shrink-0">
        {Object.entries(CATEGORY_MAP).map(([label, value]) => {
          const count =
            value === ""
              ? pickerItems.length
              : pickerItems.filter((i) => i.category?.toLowerCase() === value).length;
          return (
            <button
              key={label}
              onClick={() => setActiveCategory(label)}
              className={`font-body text-[0.65rem] tracking-[0.08em] uppercase px-3 py-1.5
                          border transition-colors duration-200 min-h-[44px]
                          ${activeCategory === label
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-scroll overflow-x-hidden min-h-0">
        {pickerLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-px w-16 bg-border overflow-hidden">
              <div className="h-full w-1/3 bg-accent animate-line-progress" />
            </div>
          </div>
        ) : filteredPicker.length === 0 ? (
          <p className="font-body text-[0.75rem] text-muted-foreground text-center py-8">
            No items in this category
          </p>
        ) : (
          filteredPicker.map((item) => (
            <div
              key={item.id}
              onClick={async () => {
                // Fetch full detail for preview
                const { data: fullDetail } = await supabase
                  .from("furniture_items")
                  .select("*")
                  .eq("id", item.id)
                  .maybeSingle();
                setPreviewItem(fullDetail ? { ...item, description: fullDetail.description, real_width: fullDetail.real_width, real_height: fullDetail.real_height, real_depth: fullDetail.real_depth, style_tags: fullDetail.style_tags } : item);
                setSelectedItemId(null);
                setEditingItemId(null);
              }}
              className={`w-full text-left px-4 py-3 border-b border-border
                         transition-colors cursor-pointer min-h-[44px]
                         ${previewItem?.id === item.id ? 'bg-accent/5' : 'hover:bg-background'}`}
            >
              <div className="flex items-center gap-3">
                {item.thumbnail_url ? (
                  <img
                    src={bustCache(item.thumbnail_url)}
                    alt={item.name}
                    className={`flex-shrink-0 rounded ${
                      item.category?.toLowerCase() === 'texture'
                        ? 'h-14 w-14 object-contain border border-border'
                        : 'h-10 w-10 object-cover'
                    }`}
                  />
                ) : (
                  <div className="h-10 w-10 border border-border bg-muted rounded
                                  flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🛋️</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[0.8rem] text-foreground truncate">{item.name}</p>
                  <p className="font-body text-[0.7rem] text-accent">{formatPrice(item.price)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFromPicker(item);
                    if (isMobile) setPickerDrawerOpen(false);
                  }}
                  className="h-7 w-7 border border-border rounded flex items-center justify-center
                             text-muted-foreground hover:text-foreground hover:border-accent
                             transition-colors cursor-pointer shrink-0"
                  title="Add to room"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Surfaces section (fixed at bottom) ── */}
      <div className="border-t border-border p-3 shrink-0">
        <p className="font-body text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase mb-3">
          Surfaces
        </p>

        <p className="font-body text-[0.6rem] tracking-[0.1em] text-muted-foreground mb-1.5">Floor</p>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {FLOOR_TEXTURES.map((t) => (
            <button
              key={t.id}
              onClick={() => setFloorTexturePath(t.url)}
              title={t.label}
              className={`aspect-square rounded-sm overflow-hidden border-2 transition-colors cursor-pointer
                ${floorTexturePath === t.url ? 'border-accent' : 'border-transparent outline outline-1 outline-border'}`}
            >
              <img src={t.url} alt={t.label} className="w-full h-full object-cover block" />
            </button>
          ))}
        </div>

        <p className="font-body text-[0.6rem] tracking-[0.1em] text-muted-foreground mb-1.5">Wall</p>
        <div className="grid grid-cols-4 gap-1.5">
          {WALL_TEXTURES.map((t) => (
            <button
              key={t.id}
              onClick={() => setWallTexturePath(t.url)}
              title={t.label}
              className={`aspect-square rounded-sm overflow-hidden border-2 transition-colors cursor-pointer
                ${wallTexturePath === t.url ? 'border-accent' : 'border-transparent outline outline-1 outline-border'}`}
            >
              <img src={t.url} alt={t.label} className="w-full h-full object-cover block" />
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-2
                      bg-surface overflow-x-auto shrink-0">

        {/* Editable room name */}
        <div className="shrink-0 mr-2">
          {isEditingName ? (
            <input
              autoFocus
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false); }}
              maxLength={60}
              className="bg-transparent border-0 border-b border-accent text-foreground
                         font-heading text-[1.3rem] font-normal outline-none py-1
                         w-full max-w-[400px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="bg-transparent border-none cursor-pointer flex items-center gap-2 p-0"
            >
              <span className="font-heading text-[1.3rem] font-normal text-foreground
                               truncate max-w-[300px]">
                {roomName}
              </span>
              <span className="font-body text-[0.65rem] tracking-[0.1em] uppercase
                               text-muted-foreground shrink-0">
                ✎ RENAME
              </span>
            </button>
          )}
        </div>

        <div className="w-px h-6 bg-border shrink-0" />

        {/* Autosave status indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {saveStatus === "saving" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="font-body text-[0.7rem] tracking-[0.08em] text-muted-foreground">SAVING…</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-body text-[0.7rem] tracking-[0.08em] text-muted-foreground">SAVED</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="font-body text-[0.7rem] tracking-[0.08em] text-muted-foreground hidden md:inline">UNSAVED</span>
            </>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoStack.length === 0} className="min-h-[44px]">
          <Undo className="h-4 w-4" />
          <span className="hidden md:inline">Undo</span>
        </Button>

        <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={!selectedItemId} className="min-h-[44px]">
          <Trash2 className="h-4 w-4" />
          <span className="hidden md:inline">Delete</span>
        </Button>

        {isMobile && (
          <Button variant="outline" size="sm" onClick={() => setPickerDrawerOpen(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4" />
            <span className="text-[0.7rem]">ADD</span>
          </Button>
        )}

        {/* Selection status + cancel */}
        {selectedItemId && (
          <span className="font-body text-[0.75rem] text-muted-foreground tracking-[0.05em] hidden md:inline truncate max-w-[200px]">
            {(() => {
              const item = roomItems.find(i => getItemKey(i) === selectedItemId);
              return item ? (furniture.find(f => f.id === item.id)?.name ?? "Item") : "Item";
            })()}
            {editingItemId === selectedItemId ? " — MOVING" : " — SELECTED"}
          </span>
        )}
        {(selectedItemId || editingItemId) && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => {
              setSelectedItemId(null);
              setEditingItemId(null);
            }}
          >
            <X className="h-4 w-4" />
            <span className="hidden md:inline">Cancel</span>
          </Button>
        )}

        <div className="flex-1" />

        {!isCopy && (
          <Button
            variant="amber-outline"
            size="sm"
            disabled={posted}
            className="min-h-[44px]"
            onClick={() => {
              if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
              setPostDialogOpen(true);
            }}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">{posted ? "Posted ✓" : "Post to Community"}</span>
          </Button>
        )}
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">

        {/* Left: Furniture Picker (desktop only) */}
        {!isMobile && (
          <div className="relative h-full" style={{ flexShrink: 0 }}>
            {/* Toggle button on right edge */}
            <button
              onClick={() => setLeftCollapsed(prev => !prev)}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-pointer"
              style={{
                right: "-16px",
                width: "16px",
                height: "48px",
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0 4px 4px 0",
                color: "hsl(var(--text-muted))",
                fontSize: "0.7rem",
              }}
            >
              {leftCollapsed ? "›" : "‹"}
            </button>
            <aside
              className="flex flex-col bg-surface min-h-0"
              style={{
                width: leftCollapsed ? "0px" : "288px",
                minWidth: leftCollapsed ? "0px" : "288px",
                height: "100%",
                overflow: leftCollapsed ? "hidden" : "visible",
                transition: "width 300ms ease, min-width 300ms ease",
                borderRight: leftCollapsed ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              <div
                style={{
                  width: "288px",
                  height: "100%",
                  opacity: leftCollapsed ? 0 : 1,
                  transition: "opacity 200ms ease",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {pickerContent}
              </div>
            </aside>
          </div>
        )}

        {/* Center: 3D Canvas */}
        <div id="room-canvas" className="flex-1 min-h-0 min-w-0 relative" style={{ transition: "flex 300ms ease" }}>
          <div className="absolute inset-0 flex flex-col">
            <RoomCanvas
              className="flex-1"
              style={{ minHeight: isMobile ? '60vh' : '100%' }}
              items={roomItems}
              furniture={furniture}
              wallpaper={wallTexturePath ? { path: wallTexturePath } : null}
              flooring={floorTexturePath ? { path: floorTexturePath } : null}
              selectedItemId={selectedItemId}
              editingItemId={editingItemId}
              onSelectItem={(key) => {
                setSelectedItemId((prev) => prev === key ? null : key);
                setEditingItemId(null);
              }}
              onEditItem={(key) => {
                setSelectedItemId(key);
                setEditingItemId((prev) => prev === key ? null : key);
              }}
              onDeselect={() => {
                setSelectedItemId(null);
                setEditingItemId(null);
              }}
              onPositionChange={(key, pos) => {
                setRoomItems((prev) =>
                  prev.map((item) =>
                    getItemKey(item) === key ? { ...item, x: pos[0], y: pos[1], z: pos[2] } : item
                  )
                );
              }}
              onRotationChange={(key, rot) => {
                setRoomItems((prev) =>
                  prev.map((item) =>
                    getItemKey(item) === key ? { ...item, rotation: (rot[1] * 180) / Math.PI } : item
                  )
                );
              }}
            />
          </div>
        </div>

        {/* Right: switches between Room Items list and Item Info Card */}
        {!isMobile && (
          <div className="relative h-full" style={{ flexShrink: 0 }}>
            {/* Toggle button on left edge */}
            <button
              onClick={() => setRightCollapsed(prev => !prev)}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-pointer"
              style={{
                left: "-16px",
                width: "16px",
                height: "48px",
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px 0 0 4px",
                color: "hsl(var(--text-muted))",
                fontSize: "0.7rem",
              }}
            >
              {rightCollapsed ? "‹" : "›"}
            </button>
            <aside
              className="flex flex-col bg-surface min-h-0"
              style={{
                width: rightCollapsed ? "0px" : "320px",
                minWidth: rightCollapsed ? "0px" : "320px",
                height: "100%",
                overflow: rightCollapsed ? "hidden" : "visible",
                transition: "width 300ms ease, min-width 300ms ease",
                borderLeft: rightCollapsed ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              <div
                style={{
                  width: "320px",
                  height: "100%",
                  opacity: rightCollapsed ? 0 : 1,
                  transition: "opacity 200ms ease",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <RightPanel
                  roomItems={roomItems}
                  furniture={furniture}
                  selectedItemId={selectedItemId}
                  editingItemId={editingItemId}
                  previewItem={previewItem}
                  formatPrice={formatPrice}
                  onSelectItem={(id) => {
                    setSelectedItemId((prev) => prev === id ? null : id);
                    setEditingItemId(null);
                    setPreviewItem(null);
                  }}
                  onDeleteItem={(id) => {
                    setUndoStack((prev) => [...prev, roomItems]);
                    setRoomItems((prev) => prev.filter((item) => getItemKey(item) !== id));
                    setSelectedItemId(null);
                    setEditingItemId(null);
                    toast({ title: "Item removed" });
                  }}
                  onAddAnother={handleAddAnother}
                  onAddToCart={handleAddToCart}
                  onAddPreviewToRoom={() => {
                    if (previewItem) {
                      handleAddFromPicker(previewItem);
                      setPreviewItem(null);
                    }
                  }}
                  onBack={() => {
                    setSelectedItemId(null);
                    setEditingItemId(null);
                  }}
                  onClearPreview={() => setPreviewItem(null)}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Mobile: right panel below canvas */}
        {isMobile && (
          <div className="w-full border-t border-border bg-surface" style={{ height: '280px' }}>
            <RightPanel
              roomItems={roomItems}
              furniture={furniture}
              selectedItemId={selectedItemId}
              editingItemId={editingItemId}
              previewItem={previewItem}
              formatPrice={formatPrice}
              onSelectItem={(id) => {
                setSelectedItemId((prev) => prev === id ? null : id);
                setEditingItemId(null);
                setPreviewItem(null);
              }}
              onDeleteItem={(id) => {
                setUndoStack((prev) => [...prev, roomItems]);
                setRoomItems((prev) => prev.filter((item) => getItemKey(item) !== id));
                setSelectedItemId(null);
                setEditingItemId(null);
                toast({ title: "Item removed" });
              }}
              onAddAnother={handleAddAnother}
              onAddToCart={handleAddToCart}
              onAddPreviewToRoom={() => {
                if (previewItem) {
                  handleAddFromPicker(previewItem);
                  setPreviewItem(null);
                }
              }}
              onBack={() => {
                setSelectedItemId(null);
                setEditingItemId(null);
              }}
              onClearPreview={() => setPreviewItem(null)}
              floorTexturePath={floorTexturePath}
              wallTexturePath={wallTexturePath}
              onFloorTextureChange={setFloorTexturePath}
              onWallTextureChange={setWallTexturePath}
            />
          </div>
        )}
      </div>

      {/* Mobile furniture picker drawer */}
      {isMobile && (
        <Drawer open={pickerDrawerOpen} onOpenChange={setPickerDrawerOpen}>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="font-body text-[0.8rem] tracking-[0.1em] uppercase
                                     text-muted-foreground">
                Add Furniture
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col overflow-hidden flex-1">
              {pickerContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {roomId && (
        <PostToCommunityDialog
          open={postDialogOpen}
          onOpenChange={setPostDialogOpen}
          roomId={roomId}
          onPosted={() => setPosted(true)}
        />
      )}

    </div>
  );
}
