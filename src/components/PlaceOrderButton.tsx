// ============================================================
// FILE: src/components/PlaceOrderButton.tsx
// PROJECT: 3D Room Designer Lovable Project
// PURPOSE: Drop-in "Place Order" button that connects to the
//          e-commerce site via orderBridge.ts.
//          Drop this wherever your furniture detail panel lives.
// ============================================================

import { useState } from "react";
import { placeFurnitureOrder, FurnitureItem, CustomerInfo } from "@/integrations/orderBridge";

// ── Props ──────────────────────────────────────────────────────
interface PlaceOrderButtonProps {
  furniture: FurnitureItem;     // The 3D furniture item selected by the user
  customer: CustomerInfo;       // Logged-in user's info (pass from auth context)
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
}

// ── Component ──────────────────────────────────────────────────
export function PlaceOrderButton({
  furniture,
  customer,
  onSuccess,
  onError,
}: PlaceOrderButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const handlePlaceOrder = async () => {
    if (state === "loading") return;
    setState("loading");
    setMessage("");
    setAttempt(0);

    const result = await placeFurnitureOrder(furniture, customer, {
      retries: 2,
      onRetry: (n) => {
        setAttempt(n);
        setMessage(`Retrying... (attempt ${n + 1})`);
      },
    });

    if (result.success) {
      setState("success");
      setMessage(`Order placed! Ref: #${result.orderId?.slice(0, 8).toUpperCase()}`);
      onSuccess?.(result.orderId!);

      // Auto-reset to idle after 4 seconds
      setTimeout(() => {
        setState("idle");
        setMessage("");
      }, 4000);
    } else {
      setState("error");
      setMessage(result.error ?? "Something went wrong");
      onError?.(result.error!);

      // Auto-reset to idle after 5 seconds
      setTimeout(() => {
        setState("idle");
        setMessage("");
      }, 5000);
    }
  };

  // ── Styles (Tailwind-compatible inline fallback) ───────────────
  const baseStyle: React.CSSProperties = {
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "15px",
    cursor: state === "loading" ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "180px",
    justifyContent: "center",
  };

  const colorMap = {
    idle:    { background: "#18181b", color: "#ffffff" },
    loading: { background: "#71717a", color: "#ffffff" },
    success: { background: "#16a34a", color: "#ffffff" },
    error:   { background: "#dc2626", color: "#ffffff" },
  };

  const labelMap = {
    idle:    `🛒 Order ${furniture.name}`,
    loading: attempt > 0 ? `↺ Retrying (${attempt + 1}/3)...` : "⏳ Placing Order...",
    success: "✓ Order Placed!",
    error:   "✗ Order Failed",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
      <button
        onClick={handlePlaceOrder}
        disabled={state === "loading" || state === "success"}
        style={{ ...baseStyle, ...colorMap[state] }}
        aria-label={`Place order for ${furniture.name}`}
      >
        {labelMap[state]}
      </button>

      {message && (
        <p
          style={{
            fontSize: "13px",
            margin: 0,
            color: state === "error" ? "#dc2626" : state === "success" ? "#16a34a" : "#71717a",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

// ── USAGE EXAMPLE (delete this before shipping) ────────────────
//
// import { PlaceOrderButton } from "@/components/PlaceOrderButton";
//
// <PlaceOrderButton
//   furniture={{ name: "Eames Lounge Chair", quantity: 1, modelId: "chair-001" }}
//   customer={{ email: user.email, userId: user.id, shippingAddress: "123 Main St" }}
//   onSuccess={(orderId) => console.log("Order created:", orderId)}
//   onError={(err) => toast.error(err)}
// />