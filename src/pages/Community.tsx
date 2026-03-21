import { useState, useEffect, useCallback } from "react";
import CommunityCard from "@/components/CommunityCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const filters = ["Most Recent", "Most Liked"];
const styleTags = ["minimalist", "japandi", "scandinavian", "industrial", "bohemian", "modern", "classic", "coastal", "dark", "bright"];

interface CommunityPost {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  like_count: number;
  user_id: string;
  style_tags: string[] | null;
  created_at: string | null;
  room_design_id: string;
  room_designs: {
    id: string;
    description: string | null;
  } | null;
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("Most Recent");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Loading timed out. Please refresh the page.");
    }, 8000);

    supabase
      .from("community_posts")
      .select("*")
      .eq("is_visible", true)
      .order(activeFilter === "Most Liked" ? "like_count" : "created_at", { ascending: false })
      .limit(12)
      .then(({ data, error: fetchErr }) => {
        clearTimeout(timeout);
        console.log("Community posts:", data?.length, fetchErr);
        if (fetchErr) {
          setError("Failed to load: " + fetchErr.message);
        } else {
          setPosts((data as unknown as CommunityPost[]) ?? []);
        }
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [activeFilter]);

  useEffect(() => {
    if (!user) { setLikedIds(new Set()); return; }
    const fetchLikes = async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id);
      setLikedIds(new Set(data?.map((l) => l.post_id) ?? []));
    };
    fetchLikes();
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel("community-likes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts", filter: "is_visible=eq.true" }, (payload) => {
        setPosts((current) =>
          current.map((post) =>
            post.id === payload.new.id ? { ...post, like_count: (payload.new as any).like_count } : post
          )
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to like rooms", variant: "destructive" });
      return;
    }
    const isLiked = likedIds.has(postId);
    setLikedIds((prev) => { const next = new Set(prev); if (isLiked) next.delete(postId); else next.add(postId); return next; });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p));

    try {
      if (isLiked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Like error:", err);
      setLikedIds((prev) => { const next = new Set(prev); if (isLiked) next.add(postId); else next.delete(postId); return next; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) } : p));
      toast({ title: "Error", description: "Failed to update like.", variant: "destructive" });
    }
  }, [user, likedIds, posts]);

  const filteredPosts = activeTag
    ? posts.filter((p) => p.style_tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()))
    : posts;

  return (
    <div className="container py-12 md:py-16">
      <div className="space-y-2 mb-10 animate-reveal-up">
        <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em]">Community</h1>
        <p className="font-body text-[0.8rem] tracking-[0.08em] uppercase text-muted-foreground">
          Explore and get inspired by room designs
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-10 animate-reveal-up delay-100">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`font-body text-[0.7rem] tracking-[0.1em] uppercase px-4 py-2 border transition-colors duration-200 ${
              activeFilter === f
                ? "border-accent text-accent"
                : "border-border text-muted-foreground hover:border-accent hover:text-accent"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {styleTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`font-body text-[0.65rem] tracking-[0.08em] uppercase px-3 py-1.5 border transition-colors duration-200 ${
              activeTag === tag
                ? "border-accent text-accent"
                : "border-border text-muted-foreground hover:border-accent/50"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-px w-32 bg-border overflow-hidden">
            <div className="h-full w-1/3 bg-accent animate-line-progress" />
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="font-body text-[0.85rem] text-destructive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent border border-border px-6 py-2 bg-transparent cursor-pointer hover:border-accent transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <p className="font-body text-[0.8rem] text-muted-foreground">No community posts yet. Be the first to share a room!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <CommunityCard
              key={post.id}
              id={post.id}
              roomDesignId={post.room_design_id}
              title={post.title}
              description={post.description}
              author={post.user_id === user?.id ? "You" : "Community Member"}
              thumbnailUrl={post.thumbnail_url ?? undefined}
              likeCount={post.like_count}
              liked={likedIds.has(post.id)}
              isOwnPost={post.user_id === user?.id}
              onLike={() => handleLike(post.id)}
              delay={80 * i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
