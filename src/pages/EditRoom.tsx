import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Save, Undo, Trash2, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RoomCanvas from "@/components/RoomCanvas";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
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
  const isMobile = useIsMobile();

  const [roomItems, setRoomItems] = useState<PlacedItem[]>(navState?.items ?? []);
  const [furniture, setFurniture] = useState<FurnitureDetail[]>(navState?.furniture ?? []);
  const [description, setDescription] = useState(navState?.description ?? "");
  const [loading, setLoading] = useState(!navState?.items);
  const [saving, setSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PlacedItem[][]>([]);
  const [pickerItems, setPickerItems] = useState<PickerItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [pickerLoading, setPickerLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posted, setPosted] = useState(false);
  const [pickerDrawerOpen, setPickerDrawerOpen] = useState(false);

  useEffect(() => {
    if (navState?.items) return;
    if (!roomId) { setLoading(false); return; }
    const fetchRoom = async () => {
      try {
        const { data: room, error } = await supabase.from("room_designs").select("*").eq("id", roomId).single();
        if (error || !room) { setLoading(false); return; }
        setDescription(room.description ?? "");
        const items = (room.items as any as PlacedItem[]) ?? [];
        setRoomItems(items);
        const itemIds = items.map((i) => i.id);
        if (itemIds.length > 0) {
          const { data: fd } = await supabase.from("furniture_items").select("*").in("id", itemIds);
          if (fd) setFurniture(fd as unknown as FurnitureDetail[]);
        }
      } catch (err) { console.error("Error fetching room:", err); }
      finally { setLoading(false); }
    };
    fetchRoom();
  }, [roomId, navState]);

  useEffect(() => {
    const fetchPicker = async () => {
      const { data, error } = await supabase.from("furniture_items").select("id, name, category, price, thumbnail_url").order("name");
      if (!error && data) setPickerItems(data);
      setPickerLoading(false);
    };
    fetchPicker();
  }, []);

  useEffect(() => {
    if (!roomId || !user) return;
    const check = async () => {
      const { data } = await supabase.from("community_posts").select("id").eq("room_design_id", roomId).eq("user_id", user.id).eq("is_visible", true).maybeSingle();
      if (data) setPosted(true);
    };
    check();
  }, [roomId, user]);

  const getFurnitureDetail = (itemId: string) => furniture.find((f) => f.id === itemId);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => prev.filter((item) => item.id !== selectedItemId));
    setSelectedItemId(null);
    toast({ title: "Item removed" });
  }, [selectedItemId, roomItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
    toast({ title: "Undo successful" });
  };

  const handleSave = async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Sign in required", variant: "destructive" }); return; }
      const { error } = await supabase.from("room_designs").update({ items: roomItems as any }).eq("id", roomId).eq("user_id", session.user.id);
      if (error) { toast({ title: "Failed to save", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Room saved!" });
      setUndoStack([]);
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddFromPicker = (pickerItem: PickerItem) => {
    if (roomItems.some((ri) => ri.id === pickerItem.id)) {
      toast({ title: "Already added", description: "This item is already in the room." });
      return;
    }
    setUndoStack((prev) => [...prev, roomItems]);
    setRoomItems((prev) => [...prev, { id: pickerItem.id, x: 0, y: 0, z: 0, rotation: 0, scale: 1 }]);
    setSelectedItemId(pickerItem.id);
    if (!furniture.find((f) => f.id === pickerItem.id)) {
      setFurniture((prev) => [...prev, { id: pickerItem.id, name: pickerItem.name, category: pickerItem.category, price: pickerItem.price, thumbnail_url: pickerItem.thumbnail_url, file_url: null, real_width: null, real_depth: null, real_height: null, floor_offset: null, style_tags: null, buy_url: null }]);
    }
    toast({ title: "Item added", description: "Reposition it in the room." });
  };

  const filteredPicker = activeCategory === "All" ? pickerItems : pickerItems.filter((i) => i.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="h-px w-32 bg-border overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-line-progress" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-2 bg-surface">
        <Button variant="amber" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoStack.length === 0}>
          <Undo className="h-4 w-4" />
          Undo
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={!selectedItemId}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <div className="flex-1" />
        <Button
          variant="amber-outline"
          size="sm"
          disabled={posted}
          onClick={() => {
            if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
            setPostDialogOpen(true);
          }}
        >
          <Share2 className="h-4 w-4" />
          {posted ? "Posted ✓" : "Post to Community"}
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Furniture Picker (left) */}
        <aside className="w-72 border-r border-border flex flex-col bg-surface">
          <div className="flex flex-wrap gap-1 p-3 border-b border-border">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-body text-[0.65rem] tracking-[0.08em] uppercase px-3 py-1.5 border transition-colors duration-200 ${
                  activeCategory === cat ? "border-accent text-accent" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {pickerLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-px w-16 bg-border overflow-hidden">
                  <div className="h-full w-1/3 bg-accent animate-line-progress" />
                </div>
              </div>
            ) : filteredPicker.length === 0 ? (
              <p className="font-body text-[0.75rem] text-muted-foreground text-center py-8">No items in this category</p>
            ) : (
              filteredPicker.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddFromPicker(item)}
                  className="w-full text-left px-4 py-3 border-b border-border hover:bg-background transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.name} className="h-10 w-10 object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 border border-border flex items-center justify-center flex-shrink-0">
                        <span className="font-body text-[0.6rem] text-muted-foreground">3D</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[0.8rem] text-foreground truncate">{item.name}</p>
                      <p className="font-body text-[0.7rem] text-accent">${item.price}</p>
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
          <RoomCanvas className="w-full h-full min-h-[400px]" items={roomItems} furniture={furniture} />
        </div>

        {/* Room Items (right) */}
        <aside className="w-80 border-l border-border flex flex-col bg-surface">
          <div className="p-4 border-b border-border">
            <h3 className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground">
              Room Items ({roomItems.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {roomItems.length === 0 ? (
              <p className="font-body text-[0.75rem] text-muted-foreground text-center py-8 px-4">
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
                    className={`w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer ${
                      isSelected ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {detail?.thumbnail_url && detail.thumbnail_url !== "PENDING_UPLOAD" ? (
                        <img src={detail.thumbnail_url} alt={detail?.name ?? item.id} className="h-10 w-10 object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 border border-border flex items-center justify-center flex-shrink-0">
                          <span className="font-body text-[0.6rem] text-muted-foreground">3D</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[0.8rem] text-foreground truncate">{detail?.name ?? item.id}</p>
                        <p className="font-body text-[0.7rem] text-accent">{detail ? `$${detail.price.toLocaleString()}` : "—"}</p>
                      </div>
                      {isSelected && (
                        <span className="font-body text-[0.6rem] tracking-[0.1em] uppercase text-accent shrink-0">Selected</span>
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
        <PostToCommunityDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} roomId={roomId} onPosted={() => setPosted(true)} />
      )}
    </div>
  );
}
