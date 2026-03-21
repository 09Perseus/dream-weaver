import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Share2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
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

  useEffect(() => {
    if (navState?.items) return; // already have data from navigation
    if (!id || id === "new") {
      setLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data: room, error } = await supabase
          .from("room_designs")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !room) {
          console.error("Failed to fetch room:", error);
          setLoading(false);
          return;
        }

        setDescription(room.description ?? "");
        const roomItems = (room.items as any as PlacedItem[]) ?? [];
        setItems(roomItems);

        // Fetch furniture details for all item IDs
        const itemIds = roomItems.map((i) => i.id);
        if (itemIds.length > 0) {
          const { data: furnitureData, error: fErr } = await supabase
            .from("furniture_items")
            .select("*")
            .in("id", itemIds);

          if (!fErr && furnitureData) {
            setFurniture(furnitureData as unknown as FurnitureDetail[]);
          }
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
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      thumbnailUrl: item.thumbnail_url ?? "",
    });
  };

  const handleAddAll = () => {
    furniture.forEach(handleAddItem);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="h-10 w-10 text-amber animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Canvas */}
      <div className="flex-1 p-4 lg:p-6">
        <RoomCanvas
          className="w-full h-[50vh] lg:h-[calc(100vh-7rem)]"
          items={items}
          furniture={furniture}
        />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border/50 p-6 space-y-6 animate-reveal-up">
        <div>
          <h2 className="text-xl font-semibold mb-1">Generated Room</h2>
          <p className="text-sm text-muted-foreground">
            {description || "Your custom design"}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Furniture in this room
          </h3>
          {furniture.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No furniture items yet
            </p>
          ) : (
            <div className="space-y-2">
              {furniture.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border/50 hover:border-amber/20 transition-colors"
                >
                  {item.thumbnail_url && item.thumbnail_url !== "PENDING_UPLOAD" ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="h-12 w-12 rounded-md object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      3D
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-sm text-amber font-semibold">
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAddItem(item)}
                    className="h-8 w-8 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {furniture.length > 0 && (
          <Button variant="amber" className="w-full" onClick={handleAddAll}>
            <ShoppingCart className="h-4 w-4" />
            Add All to Cart
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Pencil className="h-4 w-4" />
            Edit Room
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Share2 className="h-4 w-4" />
            Post
          </Button>
        </div>
      </aside>
    </div>
  );
}
