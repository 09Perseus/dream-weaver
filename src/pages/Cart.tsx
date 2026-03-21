import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";
import { createCheckout } from "@/lib/edgeFunctions";
import { toast } from "@/hooks/use-toast";

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const checkoutItems = items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }));
      const { url } = await createCheckout(checkoutItems, `${window.location.origin}/cart?success=true`, `${window.location.origin}/cart`);
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em] mb-10 animate-reveal-up">Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <h3 className="font-heading text-[1.5rem] font-normal mb-2">Your cart is empty</h3>
          <p className="font-body text-[0.8rem] text-muted-foreground mb-6">Browse rooms and add furniture you love</p>
          <Link to="/community">
            <Button variant="amber">Browse Community</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8 animate-reveal-up delay-100">
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

          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex justify-between font-body text-[0.8rem]">
              <span className="text-muted-foreground uppercase tracking-[0.08em]">Subtotal</span>
              <span className="tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-heading text-[1.2rem]">Total</span>
              <span className="font-heading text-[1.5rem] text-accent tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <Button variant="amber" className="w-full" size="lg" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Processing…" : "Proceed to Checkout"}
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
