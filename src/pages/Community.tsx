import { useState, useEffect, useCallback } from "react";
import CommunityCard from "@/components/CommunityCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

  // Fetch posts with room_designs join
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          room_designs (
            id,
            description
          )
        `)
        .eq("is_visible", true)
        .order(activeFilter === "Most Liked" ? "like_count" : "created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error("Community fetch error:", error);
      } else {
        setPosts((data as unknown as CommunityPost[]) ?? []);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [activeFilter]);

  // Fetch user's likes
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    const fetchLikes = async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id);
      setLikedIds(new Set(data?.map((l) => l.post_id) ?? []));
    };
    fetchLikes();
  }, [user]);

  // Realtime subscription for like count updates
  useEffect(() => {
    const channel = supabase
      .channel("community-likes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_posts",
          filter: "is_visible=eq.true",
        },
        (payload) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === payload.new.id
                ? { ...post, like_count: (payload.new as any).like_count }
                : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!user) {
        toast({ title: "Sign in required", description: "Sign in to like rooms", variant: "destructive" });
        return;
      }

      const isLiked = likedIds.has(postId);
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // Optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) }
            : p
        )
      );

      try {
        if (isLiked) {
          const { error: delErr } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
          if (delErr) throw delErr;
        } else {
          const { error: insErr } = await supabase
            .from("post_likes")
            .insert({ post_id: postId, user_id: user.id });
          if (insErr) throw insErr;
        }
      } catch (err) {
        console.error("Like error:", err);
        // Rollback
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) }
              : p
          )
        );
        toast({ title: "Error", description: "Failed to update like. Please try again.", variant: "destructive" });
      }
    },
    [user, likedIds, posts]
  );

  // Filter by style tag
  const filteredPosts = activeTag
    ? posts.filter((p) => p.style_tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()))
    : posts;

  return (
    <div className="container py-8 md:py-12">
      <div className="space-y-2 mb-8 animate-reveal-up">
        <h1 className="text-3xl md:text-4xl font-bold">Community</h1>
        <p className="text-muted-foreground text-lg">Explore and get inspired by room designs from the community</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-8 animate-reveal-up delay-100">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              activeFilter === f
                ? "bg-amber text-amber-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="w-px h-6 bg-border/50 mx-1" />
        {styleTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
              activeTag === tag
                ? "border-amber text-amber bg-amber/10"
                : "border-border/50 text-muted-foreground hover:border-amber/30"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-amber animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <p className="text-muted-foreground">No community posts yet. Be the first to share a room!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <CommunityCard
              key={post.id}
              id={post.id}
              roomDesignId={post.room_design_id}
              title={post.title}
              description={post.room_designs?.description ?? post.description}
              author={
                post.user_id === user?.id
                  ? "You"
                  : "Community Member"
              }
              authorInitial={post.user_id === user?.id ? "Y" : "C"}
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
