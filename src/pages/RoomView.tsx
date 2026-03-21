import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Plus, Pencil, Check, Share2, Copy } from "lucide-react";
import FurnitureDetailPanel from "@/components/FurnitureDetailPanel";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { captureRoomThumbnail } from "@/utils/captureRoomThumbnail";
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
  const { formatPrice } = useCurrency();
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
  const [communityPost, setCommunityPost] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FurnitureDetail | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    const checkPosted = async () => {
      const { data } = await supabase.from("community_posts").select("id").eq("room_design_id", id).eq("user_id", user.id).eq("is_visible", true).maybeSingle();
      if (data) setPosted(true);
    };
    checkPosted();
  }, [id, user]);

  // Fetch community post for this room
  useEffect(() => {
    if (!id) return;
    supabase
      .from("community_posts")
      .select("*")
      .eq("room_design_id", id)
      .eq("is_visible", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCommunityPost(data);
      });
  }, [id]);

  // Check if current user liked this post
  useEffect(() => {
    if (!communityPost) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", communityPost.id)
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          setIsLiked(!!data);
        });
    });
  }, [communityPost?.id]);

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

  // Capture thumbnail after render
  useEffect(() => {
    if (!id || loading) return;
    const timer = setTimeout(() => { captureRoomThumbnail(id); }, 3000);
    return () => clearTimeout(timer);
  }, [id, loading]);

  const handleAddItem = (item: FurnitureDetail) => {
    addItem({ id: item.id, name: item.name, price: item.price, thumbnailUrl: item.thumbnail_url ?? "" });
  };

  const handleAddAll = () => { furniture.forEach(handleAddItem); };

  const handleLike = async () => {
    if (!communityPost) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in to like rooms", variant: "destructive" });
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", communityPost.id).eq("user_id", session.user.id);
        setCommunityPost((prev: any) => ({ ...prev, like_count: Math.max(0, prev.like_count - 1) }));
        setIsLiked(false);
      } else {
        await supabase.from("post_likes").insert({ post_id: communityPost.id, user_id: session.user.id });
        setCommunityPost((prev: any) => ({ ...prev, like_count: prev.like_count + 1 }));
        setIsLiked(true);
      }
    } finally {
      setLikeLoading(false);
    }
  };

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
        {selectedItem ? (
          <FurnitureDetailPanel item={selectedItem} onBack={() => setSelectedItem(null)} />
        ) : (
          <>
            {/* Unified title block */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-[1.3rem] font-normal text-foreground mb-1 truncate">
                  {communityPost ? communityPost.title : (description?.substring(0, 60) || "Your custom design")}
                </h2>
                {communityPost?.description && (
                  <p className="font-body text-[0.75rem] text-muted-foreground">{communityPost.description}</p>
                )}
                {communityPost?.style_tags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {communityPost.style_tags.map((tag: string) => (
                      <span key={tag} className="font-body text-[0.6rem] tracking-[0.08em] uppercase border border-border text-muted-foreground px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {communityPost && (
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className="flex flex-col items-center gap-1 bg-transparent border border-border px-3 py-2 cursor-pointer transition-all duration-150 shrink-0 ml-4 hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: isLiked ? "hsl(var(--accent))" : undefined }}
                >
                  <span className={`text-[1.2rem] ${isLiked ? "text-accent" : "text-muted-foreground"}`}>
                    {isLiked ? "♥" : "♡"}
                  </span>
                  <span className={`font-body text-[0.65rem] tracking-[0.08em] ${isLiked ? "text-accent" : "text-muted-foreground"}`}>
                    {communityPost.like_count}
                  </span>
                </button>
              )}
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
                        <p className="font-body text-[0.75rem] text-accent">{formatPrice(item.price)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="font-body text-[0.65rem] tracking-[0.1em] uppercase border border-border text-muted-foreground px-2.5 py-1.5 bg-transparent cursor-pointer shrink-0 transition-all duration-150 hover:border-accent hover:text-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        VIEW →
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
                {!roomIsCopy && (
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
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {id && (
        <PostToCommunityDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} roomId={id} onPosted={() => setPosted(true)} />
      )}
    </div>
  );
}
