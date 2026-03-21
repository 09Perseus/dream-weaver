import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CommunityCard from "@/components/CommunityCard";
import GeneratingOverlay from "@/components/GeneratingOverlay";
import { mockCommunityPosts } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = (): boolean => {
    if (!prompt.trim()) {
      setError("Please describe your dream room first");
      return false;
    }
    if (prompt.trim().length < 10) {
      setError("Please add a bit more detail");
      return false;
    }
    setError("");
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-room",
        { body: { description: prompt.trim() } }
      );

      const errorMessage = fnError?.message || data?.error || "";

      if (fnError || data?.error) {
        console.error("Generate room error:", fnError || data?.error);
        if (errorMessage.includes("empty")) {
          toast({ title: "No furniture available", description: "No furniture in the library yet. Check back soon!", variant: "destructive" });
        } else if (errorMessage.includes("timeout")) {
          toast({ title: "Timed out", description: "Room generation timed out. Please try again.", variant: "destructive" });
        } else if (errorMessage.includes("valid furniture")) {
          toast({ title: "Design failed", description: "Could not design a room with this description. Try being more specific.", variant: "destructive" });
        } else {
          toast({ title: "Something went wrong", description: "Something went wrong generating your room. Please try again.", variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      const items: PlacedItem[] = data.items;
      const furniture: FurnitureDetail[] = data.furniture;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data: room, error: insertError } = await supabase
        .from("room_designs")
        .insert({
          description: prompt.trim(),
          items: items as any,
          user_id: session?.user?.id,
          share_token: crypto.randomUUID(),
        })
        .select("id")
        .single();

      if (insertError || !room?.id) {
        console.error("Failed to save room:", insertError);
        toast({
          title: "Failed to save room",
          description: "Failed to save room. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      navigate(`/room/${room.id}`, {
        state: { items, furniture, description: prompt.trim() },
      });
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast({
        title: "Something went wrong",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {loading && <GeneratingOverlay />}
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl w-full text-center space-y-10">
          <div className="space-y-5 animate-reveal-up">
            <h1 className="font-heading font-light uppercase tracking-[0.08em] text-foreground leading-[1.05]" style={{ fontSize: 'clamp(2rem, 8vw, 7rem)' }}>
              Describe your<br />dream room
            </h1>
            <p className="font-body text-[0.85rem] tracking-[0.1em] text-muted-foreground">
              AI-powered interior design in seconds
            </p>
          </div>

          <div className="animate-reveal-up delay-200 space-y-6 max-w-[640px] mx-auto">
            <div>
              <input
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (error) setError("");
                }}
                placeholder="A cozy Japanese bedroom with warm lighting…"
                className={`w-full bg-transparent border-0 border-b font-heading text-[1.25rem] py-3 text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors duration-200 ${
                  error
                    ? "border-b-destructive"
                    : "border-b-border focus:border-b-accent"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                disabled={loading}
              />
              {error && (
                <p className="font-body text-destructive text-[0.75rem] mt-2 text-left">
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Button
                variant="amber"
                size="lg"
                className={`w-full ${loading ? "button-loading" : ""}`}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Generating…" : "Generate Room"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Feed */}
      <section className="container pb-20">
        <div className="animate-reveal-up delay-300 mb-10">
          <h2 className="font-heading text-[2rem] font-normal tracking-[0.02em]">
            Community Rooms
          </h2>
          <p className="font-body text-[0.8rem] tracking-[0.08em] uppercase text-muted-foreground mt-2">
            Explore designs created by the community
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCommunityPosts.map((post, i) => (
            <CommunityCard
              key={post.id}
              id={post.id}
              title={post.title}
              author={post.author}
              thumbnailUrl={post.thumbnailUrl}
              likeCount={post.likeCount}
              delay={100 + i * 80}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
