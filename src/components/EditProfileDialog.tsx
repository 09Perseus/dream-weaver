import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AVATAR_COLORS = ["#C8B89A", "#C0533A", "#6A8F6A", "#5A7A9A", "#8A6A9A", "#9A8A6A"];

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentDisplayName: string | null;
  currentAvatarColor: string;
  avatarInitial: string;
  onSaved: (displayName: string | null, avatarColor: string) => void;
}

export default function EditProfileDialog({
  open,
  onOpenChange,
  userId,
  currentDisplayName,
  currentAvatarColor,
  avatarInitial,
  onSaved,
}: EditProfileDialogProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [selectedColor, setSelectedColor] = useState(currentAvatarColor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName.trim() || null,
      avatar_color: selectedColor,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Profile save error:", error);
      toast({ title: "Error", description: "Failed to save profile: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      onSaved(displayName.trim() || null, selectedColor);
      onOpenChange(false);
    }
    setSaving(false);
  };

  const initial = displayName.trim() ? displayName.trim()[0].toUpperCase() : avatarInitial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-sm p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-[1.25rem] uppercase tracking-[0.1em] text-foreground">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center border border-border"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: selectedColor,
              }}
            >
              <span
                className="font-heading text-[2rem] font-semibold"
                style={{ color: "hsl(var(--bg))" }}
              >
                {initial}
              </span>
            </div>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <label className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground">
              Display Name
            </label>
            <input
              className="input-editorial"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
            />
          </div>

          {/* Avatar color picker */}
          <div className="space-y-2">
            <label className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground">
              Avatar Colour
            </label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 transition-all duration-150"
                  style={{
                    backgroundColor: color,
                    borderRadius: "50%",
                    border:
                      selectedColor === color
                        ? "2px solid hsl(var(--text-primary))"
                        : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="amber"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
