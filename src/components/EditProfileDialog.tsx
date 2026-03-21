import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AVATAR_COLORS = ["#C8B89A", "#C0533A", "#6A8F6A", "#5A7A9A", "#8A6A9A", "#9A8A6A"];

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentDisplayName: string | null;
  currentAvatarColor: string;
  currentAvatarUrl: string | null;
  avatarInitial: string;
  onSaved: () => void;
}

export default function EditProfileDialog({
  open,
  onOpenChange,
  userId,
  currentDisplayName,
  currentAvatarColor,
  currentAvatarUrl,
  avatarInitial,
  onSaved,
}: EditProfileDialogProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [selectedColor, setSelectedColor] = useState(currentAvatarColor);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when dialog opens with new props
  useEffect(() => {
    if (open) {
      setDisplayName(currentDisplayName ?? "");
      setSelectedColor(currentAvatarColor);
      setAvatarUrl(currentAvatarUrl);
      setAvatarPreview(null);
    }
  }, [open, currentDisplayName, currentAvatarColor, currentAvatarUrl]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 2MB", variant: "destructive" });
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Error", description: "Please upload a JPG, PNG or WEBP image", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Show local preview
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({ title: "Error", description: "Upload failed: " + uploadError.message, variant: "destructive" });
        setAvatarPreview(null);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Save avatar_url immediately
      await supabase.from("profiles").upsert({
        id: userId,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      setAvatarUrl(publicUrl);
      toast({ title: "Profile picture updated" });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName.trim() || null,
      avatar_color: selectedColor,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Profile save error:", error);
      toast({ title: "Error", description: "Failed to save profile: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const initial = displayName.trim() ? displayName.trim()[0].toUpperCase() : avatarInitial;
  const previewUrl = avatarPreview || avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-sm p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-[1.25rem] uppercase tracking-[0.1em] text-foreground">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative cursor-pointer group"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1.5px solid hsl(var(--border))",
                  }}
                />
              ) : (
                <UserAvatar
                  avatarColor={selectedColor}
                  displayName={displayName.trim() || null}
                  email={null}
                  size={80}
                />
              )}

              {/* Upload overlay */}
              {uploading ? (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="h-px w-8 bg-border overflow-hidden">
                    <div className="h-full w-1/3 bg-accent animate-line-progress" />
                  </div>
                </div>
              ) : (
                <div
                  className="absolute bottom-0 right-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "hsl(var(--accent))",
                  }}
                >
                  <Camera className="h-3 w-3" style={{ color: "hsl(var(--bg))" }} />
                </div>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleAvatarUpload}
              />
            </div>
            <span className="font-body text-[0.7rem] text-muted-foreground">
              {uploading ? "Uploading..." : "JPG, PNG or WEBP · Max 2MB"}
            </span>
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
              Avatar Colour {previewUrl ? "(used when no photo)" : ""}
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
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="amber"
              className="flex-1"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
