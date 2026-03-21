import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface RoomItem {
  furniture_id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotation_y: number;
}

export interface GenerateRoomResponse {
  room: {
    description: string;
    items: RoomItem[];
  };
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
