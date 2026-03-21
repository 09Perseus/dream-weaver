import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommunityCard from "@/components/CommunityCard";
import { mockCommunityPosts } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

const loadingMessages = [
  "Designing your room...",
  "Placing furniture...",
  "Adding finishing touches...",
  "Welcome home...",
];

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setLoadingStep(0);
    intervalRef.current = setInterval(() => {
      setLoadingStep((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : 0
      );
    }, 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

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

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const items: PlacedItem[] = data.items;
      const furniture: FurnitureDetail[] = data.furniture;

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Save to room_designs
      const { data: room, error: insertError } = await supabase
        .from("room_designs")
        .insert({
          description: prompt.trim(),
          items: items as any,
          user_id: session?.user?.id ?? undefined,
          share_token: crypto.randomUUID(),
        } as any)
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
      console.error("Generate room error:", err);
      toast({
        title: "Something went wrong",
        description:
          "Something went wrong generating your room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4 animate-reveal-up">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Describe your room.
              <br />
              <span className="text-amber">See it built.</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto text-pretty">
              AI-powered interior design that turns words into furnished 3D
              rooms you can shop.
            </p>
          </div>

          <div className="animate-reveal-up delay-200 space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Describe your dream room... e.g. cozy Japanese bedroom with warm lighting"
                rows={3}
                className={`w-full bg-surface border rounded-xl px-5 py-4 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? "border-destructive focus:ring-destructive/40 focus:border-destructive/40"
                    : "border-border/70 focus:ring-amber/40 focus:border-amber/40"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                disabled={loading}
              />
              {error && (
                <p className="text-destructive text-sm mt-1.5 text-left">
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                variant="amber"
                size="lg"
                className="w-full md:w-auto min-w-[200px] text-base"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {loading ? "Generating…" : "Generate Room"}
              </Button>

              {loading && (
                <p className="text-amber text-sm font-medium animate-pulse">
                  {loadingMessages[loadingStep]}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Community Feed */}
      <section className="container pb-20">
        <div className="animate-reveal-up delay-300">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">
            Community Rooms
          </h2>
          <p className="text-muted-foreground mb-8">
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
              authorInitial={post.authorInitial}
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
