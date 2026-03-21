import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Save, Undo, Trash2, Share2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RoomCanvas from "@/components/RoomCanvas";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

interface LocationState {
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
  description?: string;
}

interface PickerItem {
  id: string;
  name: string;
  category: string;
  price: number;
  thumbnail_url: string | null;
}

const CATEGORIES = ["All", "Beds", "Sofas", "Tables", "Chairs", "Lamps", "Plants", "Rugs", "Shelves"];

export default function EditRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navState = location.state as LocationState | null;

  const [roomItems, setRoomItems] = useState<PlacedItem[]>(navState?.items ?? []);
  const [furniture, setFurniture] = useState<FurnitureDetail[]>(navState?.furniture ?? []);
  const [description, setDescription] = useState(navState?.description ?? "");
  const [loading, setLoading] = useState(!navState?.items);
  const [saving, setSaving] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PlacedItem[][]>([]);

  // Furniture picker state
  const [pickerItems, setPickerItems] = useState<PickerItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [pickerLoading, setPickerLoading] = useState(true);

  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posted, setPosted] = useState(false);

  // Fetch room data if not from nav state
  useEffect(() => {
    if (navState?.items) return;
    if (!roomId) { setLoading(false); return; }

    const fetchRoom = async () => {
      try {
        const { data: room, error } = await supabase
          .from("room_designs")
          .select("*")
          .eq("id", roomId)
          .single();

        if (error || !room) {
          console.error("Failed to fetch room:", error);
          setLoading(false);
          return;
        }

        setDescription(room.description ?? "");
        const items = (room.items as any as PlacedItem[]) ?? [];
        setRoomItems(items);

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

  // Fetch all furniture for picker
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

  const getFurnitureDetail = (itemId: string) =>
    furniture.find((f) => f.id === itemId);

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => prev.filter((item) => item.id !== selectedItemId));
    // Also remove from furniture details if no longer in room
    setSelectedItemId(null);
    toast({ title: "Item removed" });
  }, [selectedItemId, roomItems]);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, handleDeleteSelected]);

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRoomItems(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    setSelectedItemId(null);
    toast({ title: "Undo successful" });
  };

  // Save
  const handleSave = async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", description: "Please sign in to save.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("room_designs")
        .update({ items: roomItems as any })
        .eq("id", roomId)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Save error:", error);
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Room saved!" });
      setUndoStack([]);
    } catch (err) {
      console.error("Unexpected save error:", err);
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Add from picker
  const handleAddFromPicker = (pickerItem: PickerItem) => {
    if (roomItems.some((ri) => ri.id === pickerItem.id)) {
      toast({ title: "Already added", description: "This item is already in the room." });
      return;
    }

    const newItem: PlacedItem = {
      id: pickerItem.id,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1,
    };

    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => [...prev, newItem]);
    setSelectedItemId(pickerItem.id);

    // Add to furniture details if not already there
    if (!furniture.find((f) => f.id === pickerItem.id)) {
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
        },
      ]);
    }

    toast({ title: "Item added", description: "Reposition it in the room." });
  };

  const filteredPicker =
    activeCategory === "All"
      ? pickerItems
      : pickerItems.filter((i) => i.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-amber animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border/50 px-4 py-2 flex items-center gap-2 bg-surface/50 backdrop-blur-sm">
        <Button variant="amber" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
        >
          <Undo className="h-4 w-4" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={!selectedItemId}
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </Button>
        <div className="flex-1" />
        <Button
          variant="amber-outline"
          size="sm"
          disabled={posted}
          onClick={() => {
            if (!user) {
              toast({ title: "Sign in required", description: "Sign in to post to the community.", variant: "destructive" });
              return;
            }
            setPostDialogOpen(true);
          }}
        >
          <Share2 className="h-4 w-4" />
          {posted ? "Posted ✓" : "Post to Community"}
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Furniture Picker Sidebar (left) */}
        <aside className="w-72 border-r border-border/50 flex flex-col">
          <div className="flex flex-wrap gap-1 p-3 border-b border-border/50">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  activeCategory === cat
                    ? "bg-amber text-amber-foreground"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pickerLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPicker.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items in this category
              </p>
            ) : (
              filteredPicker.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddFromPicker(item)}
                  className="w-full text-left p-3 rounded-lg border border-border/50 bg-surface hover:border-amber/20 transition-all active:scale-[0.97] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover bg-muted flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-xs">
                        3D
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-amber font-semibold">${item.price}</p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 p-4">
          <RoomCanvas
            className="w-full h-full min-h-[400px]"
            items={roomItems}
            furniture={furniture}
          />
        </div>

        {/* Room Items Sidebar (right) */}
        <aside className="w-80 border-l border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Room Items ({roomItems.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {roomItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No furniture in this room. Add items from the picker.
              </p>
            ) : (
              roomItems.map((item) => {
                const detail = getFurnitureDetail(item.id);
                const isSelected = selectedItemId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer active:scale-[0.97] ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/50 bg-surface hover:border-amber/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {detail?.thumbnail_url && detail.thumbnail_url !== "PENDING_UPLOAD" ? (
                        <img
                          src={detail.thumbnail_url}
                          alt={detail?.name ?? item.id}
                          className="h-10 w-10 rounded-lg object-cover bg-muted flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-xs">
                          3D
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {detail?.name ?? item.id}
                        </p>
                        <p className="text-xs text-amber font-semibold">
                          {detail ? `$${detail.price.toLocaleString()}` : "—"}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="outline" className="text-primary border-primary/30 text-[10px] shrink-0">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

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
