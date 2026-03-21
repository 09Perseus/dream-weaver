import { useState, useEffect, useRef } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { createCheckout } from "@/lib/edgeFunctions";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Payjp: any;
  }
}

const USD_TO_JPY = 150;

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [payjpInstance, setPayjpInstance] = useState<any>(null);
  const [payjpReady, setPayjpReady] = useState(false);
  const mountedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0 || mountedRef.current) return;

    const initPayjp = () => {
      if (typeof window.Payjp === "undefined") return;
      const payjp = window.Payjp(import.meta.env.VITE_PAYJP_PUBLIC_KEY);
      const elements = payjp.elements();
      const card = elements.create("card", {
        style: {
          base: {
            color: "#F5F0E8",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            "::placeholder": { color: "#8C8880" },
          },
        },
      });
      card.mount("#payjp-card-element");
      setCardElement(card);
      setPayjpInstance(payjp);
      setPayjpReady(true);
      mountedRef.current = true;
    };

    // Retry until pay.js loads
    const interval = setInterval(() => {
      if (typeof window.Payjp !== "undefined") {
        clearInterval(interval);
        initPayjp();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [items.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cardElement) {
        try { cardElement.unmount(); } catch {}
      }
      mountedRef.current = false;
    };
  }, [cardElement]);

  const totalJPY = Math.round(
    items.reduce((sum, i) => sum + i.price * i.quantity * USD_TO_JPY, 0)
  );

  const handleCheckout = async () => {
    if (!payjpInstance || !cardElement) {
      toast({ title: "Card form not ready", description: "Please wait a moment and try again.", variant: "destructive" });
      return;
    }

    setCheckoutLoading(true);
    try {
      const { token, error: tokenError } = await payjpInstance.createToken(cardElement);

      if (tokenError) {
        toast({ title: "Card error", description: tokenError.message, variant: "destructive" });
        return;
      }

      const checkoutItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      }));

      const result = await createCheckout(token.id, totalJPY, checkoutItems, "jpy");

      clearCart();
      navigate("/order-confirmation", {
        state: {
          orderId: result.order_id,
          chargeId: result.charge_id,
          amount: result.amount,
          currency: result.currency,
          items: checkoutItems,
        },
      });
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em] mb-10 animate-reveal-up">
        Cart
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <h3 className="font-heading text-[1.5rem] font-normal mb-2">Your cart is empty</h3>
          <p className="font-body text-[0.8rem] text-muted-foreground mb-6">
            Browse rooms and add furniture you love
          </p>
          <Link to="/community">
            <Button variant="amber">Browse Community</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8 animate-reveal-up delay-100">
          {/* Items */}
          <div>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-5 border-b border-border">
                <div className="h-14 w-14 bg-surface border border-border flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.6rem] text-muted-foreground">3D</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[0.85rem] text-foreground truncate">{item.name}</p>
                  <p className="font-body text-[0.75rem] text-accent">${item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-body text-[0.8rem] w-6 text-center tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Card input */}
          <div className="pt-2">
            <label className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground block mb-3">
              Card Details
            </label>
            <div
              id="payjp-card-element"
              className="border-b border-border py-3 mb-3"
              style={{ background: "transparent", minHeight: 40 }}
            />
            <p className="font-body text-[0.7rem] text-muted-foreground">
              Test card: 4242 4242 4242 4242 · Any future expiry · Any 3-digit CVC
            </p>
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex justify-between font-body text-[0.8rem]">
              <span className="text-muted-foreground uppercase tracking-[0.08em]">Subtotal</span>
              <span className="tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-body text-[0.75rem]">
              <span className="text-muted-foreground uppercase tracking-[0.08em]">Total (JPY)</span>
              <span className="tabular-nums text-accent">¥{totalJPY.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-heading text-[1.2rem]">Total</span>
              <span className="font-heading text-[1.5rem] text-accent tabular-nums">
                ¥{totalJPY.toLocaleString()}
              </span>
            </div>
            <Button
              variant="amber"
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={checkoutLoading || !payjpReady}
            >
              {checkoutLoading ? "Processing payment…" : "Proceed to Checkout"}
            </Button>
            <button
              onClick={clearCart}
              className="w-full font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
