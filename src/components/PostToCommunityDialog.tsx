import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

export default function PostToCommunityDialog({ open, onOpenChange, roomId, onPosted }: PostToCommunityDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handlePost = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your post.", variant: "destructive" });
      return;
    }
    if (selectedTags.length === 0) {
      toast({ title: "Please select at least one style tag", variant: "destructive" });
      return;
    }

    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", variant: "destructive" });
        setPosting(false);
        return;
      }

      const { data: roomData } = await supabase
        .from("room_designs")
        .select("thumbnail_url")
        .eq("id", roomId)
        .maybeSingle();

      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: session.user.id,
          room_design_id: roomId,
          title: title.trim(),
          description: description.trim() || null,
          style_tags: selectedTags.length > 0 ? selectedTags : null,
          thumbnail_url: roomData?.thumbnail_url ?? null,
          like_count: 0,
          is_visible: true,
        });

      if (error) {
        toast({ title: "Failed to post", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Room posted to the community!" });
      onOpenChange(false);
      onPosted();
      setTitle("");
      setDescription("");
      setSelectedTags([]);
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-[1.5rem] font-normal">Post to Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <label className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="Give your room a name"
              className="input-editorial"
              maxLength={60}
            />
            <p className="font-body text-[0.65rem] text-muted-foreground mt-1 text-right">
              {60 - title.length} remaining
            </p>
          </div>

          <div>
            <label className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 280))}
              placeholder="Describe your design…"
              maxLength={280}
              rows={3}
              className="input-editorial resize-none"
            />
            <p className="font-body text-[0.65rem] text-muted-foreground mt-1 text-right">
              {280 - description.length} remaining
            </p>
          </div>

          <div>
            <label className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
              Style Tags <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`font-body text-[0.65rem] tracking-[0.08em] uppercase px-3 py-1.5 border transition-colors duration-200 ${
                    selectedTags.includes(tag)
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className={`font-body text-[0.75rem] mt-2 ${selectedTags.length === 0 ? "text-destructive" : "text-success"}`}>
              {selectedTags.length === 0 ? "Select at least one style tag to continue" : `${selectedTags.length} selected`}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button variant="amber" onClick={handlePost} disabled={posting || !title.trim() || selectedTags.length === 0}>
            {posting ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
