import React, { forwardRef } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";

interface CommunityCardProps {
  id: string;
  roomDesignId?: string;
  title: string;
  author: string;
  authorAvatarUrl?: string | null;
  authorAvatarColor?: string | null;
  thumbnailUrl?: string;
  description?: string | null;
  likeCount: number;
  liked?: boolean;
  isOwnPost?: boolean;
  onLike?: () => void;
  delay?: number;
}

const CommunityCard = forwardRef<HTMLDivElement, CommunityCardProps>(({
  id,
  roomDesignId,
  title,
  author,
  authorAvatarUrl,
  authorAvatarColor,
  thumbnailUrl,
  description,
  likeCount,
  liked = false,
  isOwnPost = false,
  onLike,
  delay = 0,
}, ref) => {
  const linkTo = roomDesignId ? `/room/${roomDesignId}` : `/room/${id}`;

  return (
    <div
      ref={ref}
      className="group animate-reveal-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link to={linkTo} className="block">
        <div className="overflow-hidden bg-card border border-border transition-all duration-200 hover:border-accent">
          <div className="relative aspect-[16/10] bg-surface overflow-hidden">
            {isOwnPost && (
              <span className="absolute top-0 left-0 z-10 font-body text-[0.6rem] tracking-[0.1em] uppercase bg-accent text-background px-2 py-0.5">
                YOUR POST
              </span>
            )}
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                {description ? (
                  <p className="font-heading italic text-[0.85rem] text-muted-foreground text-center line-clamp-3">
                    {description}
                  </p>
                ) : (
                  <div className="h-12 w-12 bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <svg className="h-6 w-6 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            <h3 className="font-heading text-[1.1rem] font-normal text-foreground truncate">{title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserAvatar
                  avatarUrl={authorAvatarUrl}
                  avatarColor={authorAvatarColor}
                  displayName={author}
                  size={24}
                />
                <span className="font-body text-[0.7rem] tracking-[0.08em] uppercase text-muted-foreground">{author}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onLike?.();
                }}
                className="flex items-center gap-1 font-body text-[0.75rem] text-muted-foreground hover:text-accent transition-colors active:scale-95"
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-accent text-accent" : ""}`} />
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
