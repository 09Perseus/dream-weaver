import React, { forwardRef } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

interface CommunityCardProps {
  id: string;
  title: string;
  author: string;
  authorInitial: string;
  thumbnailUrl?: string;
  likeCount: number;
  liked?: boolean;
  onLike?: () => void;
  delay?: number;
}

const CommunityCard = forwardRef<HTMLDivElement, CommunityCardProps>(({
  id,
  title,
  author,
  authorInitial,
  thumbnailUrl,
  likeCount,
  liked = false,
  onLike,
  delay = 0,
}, ref) => {
  return (
    <div
      ref={ref}
      className="group animate-reveal-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link to={`/room/${id}`} className="block">
        <div className="rounded-xl overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:border-amber/30 hover:shadow-lg hover:shadow-amber/5">
          <div className="aspect-[16/10] bg-surface overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center">
                  <svg className="h-6 w-6 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            <h3 className="font-medium text-foreground truncate">{title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-amber/20 flex items-center justify-center">
                  <span className="text-amber text-xs font-semibold">{authorInitial}</span>
                </div>
                <span className="text-sm text-muted-foreground">{author}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onLike?.();
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-amber transition-colors active:scale-95"
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-amber text-amber" : ""}`} />
                <span>{likeCount}</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

CommunityCard.displayName = "CommunityCard";

export default CommunityCard;
