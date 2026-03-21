import { useState } from "react";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
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
      const checkoutItems = items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      }));
      const { url } = await createCheckout(
        checkoutItems,
        `${window.location.origin}/cart?success=true`,
        `${window.location.origin}/cart`
      );
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 animate-reveal-up">Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-1">Your cart is empty</h3>
          <p className="text-muted-foreground mb-4">Browse rooms and add furniture you love</p>
          <Link to="/community">
            <Button variant="amber">Browse Community</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6 animate-reveal-up delay-100">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="h-14 w-14 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-amber font-semibold">${item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-card border border-border/50 p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <div className="border-t border-border/50 pt-4 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-amber tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <Button variant="amber" className="w-full" size="lg" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {checkoutLoading ? "Processing…" : "Proceed to Checkout"}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
