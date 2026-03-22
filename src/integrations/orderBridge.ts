// ============================================================
// FILE: src/services/orderBridge.ts
// PROJECT: 3D Room Designer Lovable Project
// PURPOSE: Sends furniture orders to the e-commerce site
//          when the user clicks "Place Order" in the designer.
// ============================================================

// ── Types ─────────────────────────────────────────────────────

export interface FurnitureItem {
  name: string;           // Must match product name in e-commerce DB
  quantity?: number;      // Defaults to 1
  modelId?: string;       // Your 3D model ID (for reference)
  thumbnailUrl?: string;  // Optional preview image
}

export interface CustomerInfo {
  userId?: string;        // If user is logged in (Supabase Auth UID)
  email: string;          // Required for order confirmation
  shippingAddress?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  productMatched?: string;
  totalPrice?: number;
  status?: string;
  error?: string;
}

// ── Configuration ─────────────────────────────────────────────
// 🔧 Replace these values with your actual e-commerce project details

const ECOMMERCE_ENDPOINT =
  import.meta.env.VITE_ECOMMERCE_ORDER_URL ||
  "https://YOUR-ECOMMERCE-PROJECT.supabase.co/functions/v1/receive-order";
// ^ Add VITE_ECOMMERCE_ORDER_URL to your .env file in the 3D designer project

const SHARED_API_KEY =
  import.meta.env.VITE_ECOMMERCE_API_KEY || "";
// ^ Add VITE_ECOMMERCE_API_KEY to your .env file in the 3D designer project
// This key must match DESIGNER_API_KEY secret set in the e-commerce Supabase project

// ── Idempotency key generator ─────────────────────────────────
// Prevents duplicate orders if the user double-clicks or the request retries
const generateIdempotencyKey = (productName: string, email: string): string => {
  const timestamp = Math.floor(Date.now() / 5000); // 5-second window
  return btoa(`${productName}:${email}:${timestamp}`).replace(/[^a-zA-Z0-9]/g, "");
};

// ── Main function: place a single furniture item order ─────────

export async function placeFurnitureOrder(
  furniture: FurnitureItem,
  customer: CustomerInfo,
  options?: { retries?: number; onRetry?: (attempt: number) => void }
): Promise<OrderResult> {
  const { retries = 2, onRetry } = options ?? {};

  const payload = {
    productName: furniture.name,
    quantity: furniture.quantity ?? 1,
    customerInfo: customer,
    idempotencyKey: generateIdempotencyKey(furniture.name, customer.email),
  };

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      onRetry?.(attempt);
    }

    try {
      const response = await fetch(ECOMMERCE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SHARED_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          orderId: data.orderId,
          productMatched: data.productMatched,
          totalPrice: data.totalPrice,
          status: data.status,
        };
      }

      // Non-retryable errors (bad request, not found, unauthorized)
      if ([400, 401, 404, 409].includes(response.status)) {
        return { success: false, error: data.error ?? `HTTP ${response.status}` };
      }

      // 5xx errors are retried
      lastError = data.error ?? `Server error ${response.status}`;
    } catch (networkError) {
      lastError = networkError instanceof Error ? networkError.message : "Network failure";
    }
  }

  return { success: false, error: `Failed after ${retries + 1} attempts: ${lastError}` };
}

// ── Convenience: place orders for multiple furniture items ─────

export async function placeMultipleFurnitureOrders(
  items: FurnitureItem[],
  customer: CustomerInfo
): Promise<{ results: OrderResult[]; allSucceeded: boolean }> {
  const results = await Promise.all(
    items.map((item) => placeFurnitureOrder(item, customer))
  );
  const allSucceeded = results.every((r) => r.success);
  return { results, allSucceeded };
}