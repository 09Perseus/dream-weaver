import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Eye, Pencil, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostToCommunityDialog from "@/components/PostToCommunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Room {
  id: string;
  description: string | null;
  created_at: string | null;
  is_shared: boolean;
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
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Loading timed out. Please refresh the page.");
    }, 8000);

    const fetchRooms = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/sign-in?redirect=/my-rooms"); return; }

        const [roomsRes, postsRes] = await Promise.all([
          supabase.from("room_designs").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
          supabase.from("community_posts").select("room_design_id").eq("user_id", session.user.id).eq("is_visible", true),
        ]);

        if (roomsRes.error) {
          console.error("My rooms error:", roomsRes.error);
          setError("Failed to load rooms: " + roomsRes.error.message);
          return;
        }

        setRooms(roomsRes.data ?? []);
        setPostedRoomIds(new Set(postsRes.data?.map((p) => p.room_design_id) ?? []));
      } catch (err: any) {
        console.error("Unexpected my rooms error:", err);
        setError("Unexpected error: " + err.message);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    fetchRooms();

    return () => clearTimeout(timeout);
  }, [navigate]);

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
    if (!session) return;
    const { error } = await supabase.from("community_posts").update({ is_visible: false }).eq("room_design_id", roomId).eq("user_id", session.user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to remove from community.", variant: "destructive" });
    } else {
      setPostedRoomIds((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
      toast({ title: "Removed from community feed" });
    }
    setUnposting(null);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="h-px w-32 bg-border overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-line-progress" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-10 animate-reveal-up">
        <div>
          <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em]">My Rooms</h1>
          <p className="font-body text-[0.8rem] tracking-[0.08em] uppercase text-muted-foreground mt-2">Your saved designs</p>
        </div>
        <Link to="/">
          <Button variant="amber">Create New Room</Button>
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
            return (
              <div
                key={room.id}
                className="border border-border bg-surface animate-reveal-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="aspect-[4/3] bg-surface flex items-center justify-center border-b border-border">
                  <p className="font-heading italic text-[0.85rem] text-muted-foreground px-6 text-center">
                    {room.description
                      ? room.description.length > 60 ? room.description.slice(0, 60) + "…" : room.description
                      : "Untitled Room"}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-heading text-[1.1rem] font-normal text-foreground">
                    {room.description
                      ? room.description.length > 60 ? room.description.slice(0, 60) + "…" : room.description
                      : "Untitled Room"}
                  </h3>
                  <p className="font-body text-[0.7rem] tracking-[0.08em] uppercase text-muted-foreground">
                    {room.created_at ? format(new Date(room.created_at), "MMMM d, yyyy") : "Unknown date"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Link to={`/room/${room.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/room/${room.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                    {isPosted ? (
                      <Button variant="outline" size="sm" onClick={() => handleUnpost(room.id)} disabled={unposting === room.id}>
                        <X className="h-3.5 w-3.5" />
                        {unposting === room.id ? "…" : "Unpost"}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setPostDialogRoomId(room.id)}>
                        <Share2 className="h-3.5 w-3.5" />
                        Post
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="ml-auto"
                      onClick={() => handleDelete(room.id)}
                      disabled={deleting === room.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
