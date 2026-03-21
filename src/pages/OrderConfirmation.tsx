import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderState {
  orderId: string;
  chargeId: string;
  amount: number;
  currency: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as OrderState | null;

  useEffect(() => {
    if (!state) navigate("/cart", { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="container py-16 max-w-lg text-center animate-reveal-up px-6">
      {/* Checkmark */}
      <div
        className="mx-auto mb-8 flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid hsl(var(--success))",
        }}
      >
        <Check className="h-8 w-8" style={{ color: "hsl(var(--success))" }} />
      </div>

      <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em] mb-2">
        Order Confirmed
      </h1>
      <p className="font-body text-[0.85rem] text-muted-foreground mb-10">
        Thank you for your order
      </p>

      {/* Order details */}
      <div className="bg-surface border border-border p-6 text-left space-y-3 mb-8">
        <div className="flex justify-between font-body text-[0.75rem]">
          <span className="text-muted-foreground uppercase tracking-[0.08em]">Order ID</span>
          <span className="font-mono text-muted-foreground text-[0.7rem]">{state.orderId}</span>
        </div>
        <div className="flex justify-between font-body text-[0.75rem]">
          <span className="text-muted-foreground uppercase tracking-[0.08em]">Charge ID</span>
          <span className="font-mono text-muted-foreground text-[0.7rem]">{state.chargeId}</span>
        </div>
        <div className="flex justify-between font-body text-[0.75rem]">
          <span className="text-muted-foreground uppercase tracking-[0.08em]">Total</span>
          <span className="text-accent font-heading text-[1.25rem]">
            ¥{state.amount.toLocaleString()}
          </span>
        </div>

        {/* Items */}
        <div className="border-t border-border pt-3 mt-3 space-y-2">
          {state.items.map((item) => (
            <div key={item.id} className="flex justify-between font-body text-[0.8rem]">
              <span className="text-foreground">{item.name}</span>
              <span className="text-muted-foreground">×{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link to="/my-rooms" className="flex-1">
          <Button variant="amber" className="w-full">View My Rooms</Button>
        </Link>
        <Link to="/" className="flex-1">
          <Button variant="outline" className="w-full">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
