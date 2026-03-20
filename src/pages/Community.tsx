import { useState } from "react";
import CommunityCard from "@/components/CommunityCard";
import { mockCommunityPosts } from "@/data/mockData";

const filters = ["Most Recent", "Most Liked"];
const styleTags = ["Minimal", "Japanese", "Scandinavian", "Industrial", "Bohemian", "Modern"];

export default function Community() {
  const [activeFilter, setActiveFilter] = useState("Most Recent");
  const [activeTag, setActiveTag] = useState<string | null>(null);

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
            delay={80 * i}
          />
        ))}
      </div>
    </div>
  );
}
