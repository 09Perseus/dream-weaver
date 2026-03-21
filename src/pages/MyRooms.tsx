import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/sign-in?redirect=/my-rooms");
        return;
      }

      const { data: rooms, error } = await supabase
        .from("room_designs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching rooms:", error);
        toast({ title: "Error", description: "Failed to load your rooms.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setRooms(rooms ?? []);
      setLoading(false);
    };

    fetchRooms();
  }, [navigate]);

  const handleDelete = async (roomId: string) => {
    setDeleting(roomId);
    const { error } = await supabase
      .from("room_designs")
      .delete()
      .eq("id", roomId);

    if (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete room.", variant: "destructive" });
    } else {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast({ title: "Deleted", description: "Room deleted successfully." });
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber" />
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="flex items-center justify-between mb-8 animate-reveal-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">My Rooms</h1>
          <p className="text-muted-foreground mt-1">Your saved room designs</p>
        </div>
        <Link to="/">
          <Button variant="amber">Create New Room</Button>
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-1">No rooms yet</h3>
          <p className="text-muted-foreground mb-4">Go generate your first room!</p>
          <Link to="/">
            <Button variant="amber">Get Started</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, i) => (
            <div
              key={room.id}
              className="rounded-xl overflow-hidden bg-card border border-border/50 animate-reveal-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[16/10] bg-surface flex items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center">
                  <svg className="h-6 w-6 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-medium">
                  {room.description
                    ? room.description.length > 60
                      ? room.description.slice(0, 60) + "…"
                      : room.description
                    : "Untitled Room"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {room.created_at
                    ? format(new Date(room.created_at), "MMMM d, yyyy")
                    : "Unknown date"}
                </p>
                <div className="flex items-center gap-2">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleDelete(room.id)}
                    disabled={deleting === room.id}
                  >
                    {deleting === room.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
