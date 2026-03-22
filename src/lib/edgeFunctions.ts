import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface PlacedItem {
  id: string;
  instanceId?: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
}

/** Returns the unique key for a placed item (instanceId if present, else id) */
export function getItemKey(item: PlacedItem): string {
  return item.instanceId || item.id;
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
  description: string | null;
}

export interface GenerateRoomResponse {
  items: PlacedItem[];
  furniture: FurnitureDetail[];
}

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateCheckoutResponse {
  success: boolean;
  charge_id: string;
  order_id: string;
  amount: number;
  currency: string;
  error?: string;
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
  token: string,
  amount: number,
  items: CheckoutItem[],
  currency: string = "jpy"
): Promise<CreateCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { token, amount, items, currency },
  });

  if (error) {
    throw new Error(error.message || "Failed to process payment");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as CreateCheckoutResponse;
}
