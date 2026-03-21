import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface PlacedItem {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
}

export interface FurnitureDetail {
  id: string;
  name: string;
  category: string;
  price: number;
  file_url: string | null;
  thumbnail_url: string | null;
  real_width: number | null;
  real_depth: number | null;
  real_height: number | null;
  floor_offset: number | null;
  style_tags: string[] | null;
  buy_url: string | null;
}

export interface GenerateRoomResponse {
  items: PlacedItem[];
  furniture: FurnitureDetail[];
}

export interface CheckoutItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateCheckoutResponse {
  url: string;
}

// ── Functions ──────────────────────────────────────────

export async function generateRoom(
  description: string
): Promise<GenerateRoomResponse> {
  const { data, error } = await supabase.functions.invoke("generate-room", {
    body: { description },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate room");
  }

  return data as GenerateRoomResponse;
}

export async function createCheckout(
  items: CheckoutItem[],
  successUrl: string,
  cancelUrl: string
): Promise<CreateCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { items, success_url: successUrl, cancel_url: cancelUrl },
  });

  if (error) {
    throw new Error(error.message || "Failed to create checkout session");
  }

  return data as CreateCheckoutResponse;
}
