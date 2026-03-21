import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Plus, Pencil, Check, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

interface LocationState {
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
  description?: string;
}

export default function RoomView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const navState = location.state as LocationState | null;

  const [items, setItems] = useState<PlacedItem[]>(navState?.items ?? []);
  const [furniture, setFurniture] = useState<FurnitureDetail[]>(navState?.furniture ?? []);
  const [description, setDescription] = useState(navState?.description ?? "");
  const [loading, setLoading] = useState(!navState?.items);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posted, setPosted] = useState(false);
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [roomIsCopy, setRoomIsCopy] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const checkPosted = async () => {
      const { data } = await supabase.from("community_posts").select("id").eq("room_design_id", id).eq("user_id", user.id).eq("is_visible", true).maybeSingle();
      if (data) setPosted(true);
    };
    checkPosted();
  }, [id, user]);

  useEffect(() => {
    if (navState?.items) return;
    if (!id || id === "new") { setLoading(false); return; }

    const fetchRoom = async () => {
      try {
        const { data: room, error } = await supabase.from("room_designs").select("*").eq("id", id).single();
        if (error || !room) { setLoading(false); return; }

        setDescription(room.description ?? "");
        setRoomOwnerId(room.user_id);
        setRoomIsCopy(!!room.is_copy);
        const roomItems = (room.items as any as PlacedItem[]) ?? [];
        setItems(roomItems);

        const itemIds = roomItems.map((i) => i.id);
        if (itemIds.length > 0) {
          const { data: furnitureData } = await supabase.from("furniture_items").select("*").in("id", itemIds);
          if (furnitureData) setFurniture(furnitureData as unknown as FurnitureDetail[]);
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id, navState]);

  const handleAddItem = (item: FurnitureDetail) => {
    addItem({ id: item.id, name: item.name, price: item.price, thumbnailUrl: item.thumbnail_url ?? "" });
  };

  const handleAddAll = () => { furniture.forEach(handleAddItem); };

  const performCopy = async () => {
    const { data, error } = await (supabase as any)
      .from("room_designs")
      .insert({
        user_id: user!.id,
        description,
        items: items as any,
        share_token: crypto.randomUUID(),
        source_room_id: id,
        is_copy: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    toast({ title: "Room copied to your account!" });
    navigate(`/room/${data.id}/edit`);
  };

  const handleCopyRoom = async () => {
    if (!user) {
      toast({ title: "Sign in to copy this room", variant: "destructive" });
      return;
    }
    if (copying) return;
    setCopying(true);
    try {
      // Check for existing copy
      const { data: existing } = await (supabase as any)
        .from("room_designs")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_room_id", id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "You already have a copy of this room",
          description: "Check My Rooms, or click the button again to create another copy.",
        });
        setCopying(false);
        return;
      }

      await performCopy();
    } catch (err) {
      console.error("Copy room error:", err);
      toast({ title: "Failed to copy room", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const isOwnRoom = user?.id === roomOwnerId;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row">
        <div className="flex-1 p-4 lg:p-6 flex items-center justify-center bg-surface">
          <p className="font-heading italic text-[1.2rem] text-muted-foreground">Loading your room…</p>
        </div>
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-surface">
          <div className="p-6 border-b border-border">
            <div className="h-6 bg-muted w-40 animate-skeleton-pulse mb-2" />
            <div className="h-4 bg-muted w-60 animate-skeleton-pulse" />
          </div>
          <div className="p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4 border-b border-border last:border-b-0 animate-skeleton-pulse">
                <div className="h-12 w-12 bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted w-3/4" />
                  <div className="h-3 bg-muted w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row">
      {/* Canvas */}
      <div className="flex-1 p-4 lg:p-6">
        <RoomCanvas className="w-full h-[50vh] lg:h-[calc(100vh-5rem)]" items={items} furniture={furniture} />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-surface">
        <div className="p-6 border-b border-border">
          <h2 className="font-heading text-[1.5rem] font-normal mb-1">Generated Room</h2>
          <p className="font-body text-[0.75rem] text-muted-foreground">{description || "Your custom design"}</p>
        </div>

        <div className="p-6 border-b border-border">
          <h3 className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground mb-4">
            Furniture in this room
          </h3>
          {furniture.length === 0 ? (
            <p className="font-body text-[0.75rem] text-muted-foreground">No furniture items yet</p>
          ) : (
            <div>
              {furniture.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-4 border-b border-border last:border-b-0">
                  {item.thumbnail_url && item.thumbnail_url !== "PENDING_UPLOAD" ? (
                    <img src={item.thumbnail_url} alt={item.name} className="h-12 w-12 object-cover bg-surface flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-12 bg-surface border border-border flex items-center justify-center flex-shrink-0">
                      <span className="font-body text-[0.6rem] text-muted-foreground">3D</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[0.8rem] text-foreground truncate">{item.name}</p>
                    <p className="font-body text-[0.75rem] text-accent">${item.price.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleAddItem(item)}
                    className="font-body text-[0.65rem] tracking-[0.1em] uppercase text-accent hover:underline shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center md:block md:min-h-0 md:min-w-0"
                  >
                    ADD →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-3">
          {furniture.length > 0 && (
            <Button variant="amber" className="w-full min-h-[52px]" onClick={handleAddAll}>
              Add All to Cart
            </Button>
          )}

          {!isOwnRoom && (
            <Button
              variant="outline"
              className={`w-full ${copying ? "button-loading" : ""}`}
              disabled={copying}
              onClick={handleCopyRoom}
            >
              <Copy className="h-4 w-4" />
              {copying ? "Copying…" : "Copy This Room"}
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (!user) { toast({ title: "Sign in required", description: "Please sign in to edit rooms.", variant: "destructive" }); return; }
                navigate(`/room/${id}/edit`);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={posted}
              onClick={() => {
                if (!user) { toast({ title: "Sign in required", description: "Sign in to post to the community.", variant: "destructive" }); return; }
                setPostDialogOpen(true);
              }}
            >
              {posted ? <><Check className="h-4 w-4" />Posted ✓</> : <><Share2 className="h-4 w-4" />Post</>}
            </Button>
          </div>
        </div>
      </aside>

      {id && (
        <PostToCommunityDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} roomId={id} onPosted={() => setPosted(true)} />
      )}
    </div>
  );
}
