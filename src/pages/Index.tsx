import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommunityCard from "@/components/CommunityCard";
import { mockCommunityPosts } from "@/data/mockData";
import { generateRoom } from "@/lib/edgeFunctions";
import { toast } from "@/hooks/use-toast";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const result = await generateRoom(prompt);
      console.log("Generated room:", result);
      // Use a placeholder id until real persistence is wired up
      navigate(`/room/new?prompt=${encodeURIComponent(prompt)}`);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
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
              AI-powered interior design that turns words into furnished 3D rooms you can shop.
            </p>
          </div>

          <div className="animate-reveal-up delay-200 space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your dream room... e.g. cozy Japanese bedroom with warm lighting"
                rows={3}
                className="w-full bg-surface border border-border/70 rounded-xl px-5 py-4 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber/40 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>
            <Button
              variant="amber"
              size="lg"
              className="w-full md:w-auto min-w-[200px] text-base"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
            >
              <Sparkles className="h-5 w-5" />
              Generate Room
            </Button>
          </div>
        </div>
      </section>

      {/* Community Feed */}
      <section className="container pb-20">
        <div className="animate-reveal-up delay-300">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">Community Rooms</h2>
          <p className="text-muted-foreground mb-8">Explore designs created by the community</p>
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
