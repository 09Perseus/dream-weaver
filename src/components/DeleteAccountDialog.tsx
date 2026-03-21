import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export default function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
}: DeleteAccountDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const emailMatches = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = async () => {
    if (!emailMatches) return;
    setDeleting(true);

    const { error } = await supabase.functions.invoke("delete-account");

    if (error) {
      console.error("Delete account error:", error);
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    toast({ title: "Account deleted" });
    navigate("/");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-sm p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-[1.25rem] uppercase tracking-[0.1em] text-destructive">
            Delete Account
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-5">
          <p className="font-body text-[0.85rem] text-muted-foreground leading-relaxed">
            This will permanently delete your account, all your saved rooms, and your community posts. This cannot be undone.
          </p>

          <div className="space-y-2">
            <label className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground">
              Type your email to confirm
            </label>
            <input
              className="input-editorial"
              placeholder={userEmail}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={!emailMatches || deleting}
            >
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
