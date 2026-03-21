import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STYLE_TAGS = [
  "minimalist", "japandi", "scandinavian", "industrial",
  "bohemian", "modern", "classic", "coastal", "dark", "bright",
];

interface PostToCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  onPosted: () => void;
}

export default function PostToCommunityDialog({
  open,
  onOpenChange,
  roomId,
  onPosted,
}: PostToCommunityDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePost = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your post.", variant: "destructive" });
      return;
    }

    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", description: "Sign in to post to the community.", variant: "destructive" });
        setPosting(false);
        return;
      }

      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: session.user.id,
          room_design_id: roomId,
          title: title.trim(),
          description: description.trim() || null,
          style_tags: selectedTags.length > 0 ? selectedTags : null,
          thumbnail_url: null,
          like_count: 0,
          is_visible: true,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Post to community error:", error);
        toast({ title: "Failed to post", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Posted!", description: "Room posted to the community!" });
      onOpenChange(false);
      onPosted();
      setTitle("");
      setDescription("");
      setSelectedTags([]);
    } catch (err) {
      console.error("Unexpected post error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post to Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="Give your room a name"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {60 - title.length} characters remaining
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 280))}
              placeholder="Describe your design..."
              maxLength={280}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {280 - description.length} characters remaining
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Style Tags</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                    selectedTags.includes(tag)
                      ? "border-amber text-amber bg-amber/10"
                      : "border-border/50 text-muted-foreground hover:border-amber/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button variant="amber" onClick={handlePost} disabled={posting || !title.trim()}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {posting ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
