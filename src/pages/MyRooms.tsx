import { useState, useEffect } from "react";
import SkeletonCard from "@/components/SkeletonCard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, Pencil, Share2, EyeOff, Trash2 } from "lucide-react";

interface Room {
  id: string;
  description: string | null;
  created_at: string | null;
  is_shared: boolean;
  is_copy?: boolean;
  source_room_id?: string | null;
  thumbnail_url?: string | null;
}

export default function MyRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [postedRoomIds, setPostedRoomIds] = useState<Set<string>>(new Set());
  const [postDialogRoomId, setPostDialogRoomId] = useState<string | null>(null);
  const [unposting, setUnposting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Loading timed out. Please refresh the page.");
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);

      if (!session) {
        navigate("/sign-in?redirect=/my-rooms");
        return;
      }

      Promise.all([
        supabase.from("room_designs").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("community_posts").select("room_design_id").eq("user_id", session.user.id).eq("is_visible", true),
      ]).then(([roomsRes, postsRes]) => {
        console.log("Rooms:", roomsRes.data?.length, roomsRes.error);
        if (roomsRes.error) {
          setError("Failed to load rooms: " + roomsRes.error.message);
        } else {
          setRooms(roomsRes.data ?? []);
          setPostedRoomIds(new Set(postsRes.data?.map((p) => p.room_design_id) ?? []));
        }
        setLoading(false);
      });
    });

    return () => clearTimeout(timeout);
  }, []);

  const handleDelete = async (roomId: string) => {
    setDeleting(roomId);
    const { error } = await supabase.from("room_designs").delete().eq("id", roomId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete room.", variant: "destructive" });
    } else {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast({ title: "Room deleted" });
    }
    setDeleting(null);
  };

  const handleUnpost = async (roomId: string) => {
    setUnposting(roomId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUnposting(null); return; }

    // Step 1: find the post
    const { data: post, error: findError } = await supabase
      .from("community_posts")
      .select("id")
      .eq("room_design_id", roomId)
      .eq("user_id", session.user.id)
      .eq("is_visible", true)
      .maybeSingle();

    if (findError || !post) {
      toast({ title: "Not found", description: "Could not find your post. It may already be removed.", variant: "destructive" });
      setUnposting(null);
      return;
    }

    // Step 2: update by exact id
    const { error: updateError } = await supabase
      .from("community_posts")
      .update({ is_visible: false })
      .eq("id", post.id)
      .eq("user_id", session.user.id);

    if (updateError) {
      toast({ title: "Error", description: "Failed to unpost: " + updateError.message, variant: "destructive" });
    } else {
      setPostedRoomIds((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
      toast({ title: "Removed from community feed" });
    }
    setUnposting(null);
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="mb-10">
          <div className="h-10 bg-muted w-48 animate-skeleton-pulse" />
          <div className="h-4 bg-muted w-32 mt-2 animate-skeleton-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-20 text-center">
        <p className="font-body text-[0.85rem] text-destructive mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent border border-border px-6 py-2 bg-transparent cursor-pointer hover:border-accent transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-reveal-up">
        <div>
          <h1 className="font-heading text-[2rem] md:text-[2.5rem] font-light uppercase tracking-[0.05em]">My Rooms</h1>
          <p className="font-body text-[0.8rem] tracking-[0.08em] uppercase text-muted-foreground mt-2">Your saved designs</p>
        </div>
        <Link to="/">
          <Button variant="amber" className="w-full sm:w-auto min-h-[44px]">Create New Room</Button>
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <h3 className="font-heading text-[1.5rem] font-normal mb-2">No rooms yet</h3>
          <p className="font-body text-[0.8rem] text-muted-foreground mb-6">Go generate your first room!</p>
          <Link to="/">
            <Button variant="amber">Get Started</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, i) => {
            const isPosted = postedRoomIds.has(room.id);
            const desc = room.description ?? "Untitled Room";
            const displayDesc = room.is_copy
              ? (desc.startsWith("Copy of") ? desc : `Copy of ${desc}`).slice(0, 60)
              : desc.length > 60 ? desc.slice(0, 60) + "…" : desc;

            return (
              <div
                key={room.id}
                className="border border-border bg-surface animate-reveal-up overflow-hidden min-w-0"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative h-[200px] bg-surface border-b border-border overflow-hidden">
                  {room.is_copy && (
                    <span className="absolute top-0 left-0 z-10 font-body text-[0.6rem] tracking-[0.1em] uppercase bg-surface border border-border text-muted-foreground px-2 py-0.5">
                      COPIED
                    </span>
                  )}
                  {(room as any).thumbnail_url ? (
                    <img
                      src={(room as any).thumbnail_url}
                      alt={displayDesc}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                      <span className="font-heading italic text-[0.85rem] text-muted-foreground px-6 text-center truncate">
                        {displayDesc}
                      </span>
                      <span className="font-body text-[0.65rem] tracking-[0.1em] uppercase text-muted-foreground opacity-50">
                        Preview pending
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-heading text-[1.1rem] font-normal text-foreground truncate">
                    {displayDesc}
                  </h3>
                  <p className="font-body text-[0.7rem] tracking-[0.08em] uppercase text-muted-foreground">
                    {room.created_at ? format(new Date(room.created_at), "MMMM d, yyyy") : "Unknown date"}
                  </p>
                  <div
                    className="flex items-center px-4 py-3 border-t border-border"
                    style={{ justifyContent: room.is_copy ? "space-around" : "space-between" }}
                  >
                    <button
                      onClick={() => navigate(`/room/${room.id}`)}
                      title="View Room"
                      className="w-9 h-9 flex items-center justify-center rounded cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                      style={{ background: "#4A90D9", border: "none" }}
                    >
                      <Eye size={16} color="white" />
                    </button>
                    <button
                      onClick={() => navigate(`/room/${room.id}/edit`)}
                      title="Edit Room"
                      className="w-9 h-9 flex items-center justify-center rounded cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                      style={{ background: "#C8B89A", border: "none" }}
                    >
                      <Pencil size={16} color="#0F0E0C" />
                    </button>
                    {!room.is_copy && (
                      <button
                        onClick={() => isPosted ? handleUnpost(room.id) : setPostDialogRoomId(room.id)}
                        disabled={unposting === room.id}
                        title={isPosted ? "Remove from Community" : "Post to Community"}
                        className="w-9 h-9 flex items-center justify-center rounded cursor-pointer shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50"
                        style={{ background: isPosted ? "#6A8F6A" : "#7A6A9A", border: "none" }}
                      >
                        {isPosted ? <EyeOff size={16} color="white" /> : <Share2 size={16} color="white" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deleting === room.id}
                      title="Delete Room"
                      className="w-9 h-9 flex items-center justify-center rounded cursor-pointer shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50"
                      style={{ background: "#C0533A", border: "none" }}
                    >
                      <Trash2 size={16} color="white" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {postDialogRoomId && (
        <PostToCommunityDialog
          open={!!postDialogRoomId}
          onOpenChange={(open) => { if (!open) setPostDialogRoomId(null); }}
          roomId={postDialogRoomId}
          onPosted={() => {
            setPostedRoomIds((prev) => new Set([...prev, postDialogRoomId]));
            setPostDialogRoomId(null);
          }}
        />
      )}
    </div>
  );
}
