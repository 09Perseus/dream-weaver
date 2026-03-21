import { supabase } from "@/integrations/supabase/client";

export async function captureRoomThumbnail(roomId: string): Promise<string | null> {
  try {
    const canvas = document.querySelector("#room-canvas canvas") as HTMLCanvasElement;
    if (!canvas) {
      console.log("No canvas found for thumbnail capture");
      return null;
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.85
      );
    });

    const filename = `room-${roomId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("thumbnails")
      .upload(filename, blob, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error("Thumbnail upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("thumbnails")
      .getPublicUrl(filename);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    await supabase
      .from("room_designs")
      .update({ thumbnail_url: publicUrl } as any)
      .eq("id", roomId)
      .eq("user_id", session.user.id);

    console.log("Thumbnail saved:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("Thumbnail capture failed:", err);
    return null;
  }
}
