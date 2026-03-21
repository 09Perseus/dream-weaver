import { useState, useEffect } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ensureEnglishError, friendlySupabaseError } from "@/utils/translateError";

declare global {
  interface Window {
    Payjp: any;
  }
}

const USD_TO_JPY = 150;

// Cache PAY.JP instance globally to avoid "Already instantiated" error
let globalPayjp: any = null;
let globalCardElement: any = null;
let isMounted = false;

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [payjp, setPayjp] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [payjpReady, setPayjpReady] = useState(false);
  const [payjpError, setPayjpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tryMount = () => {
      if (typeof (window as any).Payjp === "undefined") {
        console.log("Waiting for PAY.JP script...");
        setTimeout(tryMount, 300);
        return;
      }

      // Already mounted from a previous render — just restore state
      if (isMounted && globalPayjp && globalCardElement) {
        setPayjp(globalPayjp);
        setCardElement(globalCardElement);
        setPayjpReady(true);
        return;
      }

      try {
        const key = import.meta.env.VITE_PAYJP_PUBLIC_KEY;
        console.log("Mounting PAY.JP with key:", key?.substring(0, 12));

        if (!key) {
          setPayjpError("PAY.JP public key is missing");
          return;
        }

        if (!globalPayjp) {
          globalPayjp = (window as any).Payjp(key);
        }

        if (!globalCardElement) {
          const elements = globalPayjp.elements();
          globalCardElement = elements.create("card", {
            style: {
              base: {
                color: "#F5F0E8",
                fontFamily: "Inter, sans-serif",
                fontSize: "16px",
                "::placeholder": { color: "#8C8880" },
              },
            },
          });
        }

        if (!isMounted) {
          // Small delay to ensure DOM is fully rendered
          setTimeout(() => {
            const mountPoint = document.getElementById("payjp-card-element");
            if (!mountPoint) {
              console.error("Mount point #payjp-card-element not found");
              setTimeout(tryMount, 300);
              return;
            }
            globalCardElement.mount("#payjp-card-element");
            isMounted = true;
            setPayjp(globalPayjp);
            setCardElement(globalCardElement);
            setPayjpReady(true);
            console.log("PAY.JP card element mounted successfully");
          }, 100);
          return;
        }

        setPayjp(globalPayjp);
        setCardElement(globalCardElement);
        setPayjpReady(true);
        console.log("PAY.JP card element mounted successfully");
      } catch (err: any) {
        console.error("PAY.JP mount error:", err);
        setPayjpError(ensureEnglishError(err.message));
      }
    };

    tryMount();

    return () => {
      isMounted = false;
      globalCardElement = null;
    };
  }, []);

  const totalJPY = Math.round(
    items.reduce((sum, i) => sum + i.price * i.quantity * USD_TO_JPY, 0),
  );

  const handleCheckout = async () => {
    console.log("Checkout clicked");
    console.log("payjp:", !!payjp);
    console.log("cardElement:", !!cardElement);
    console.log("payjpReady:", payjpReady);

    if (!payjp || !cardElement) {
      toast({
        title: "Card form is not ready",
        description: "Please wait and try again.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      console.log("Calling createToken...");
      const result = await payjp.createToken(cardElement);
      console.log("PAY.JP result:", JSON.stringify(result));

      if (result?.error) {
        toast({
          title: "Card error",
          description: ensureEnglishError(result.error.message),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const tokenId = result?.token?.id || result?.id || null;
      console.log("Token ID:", tokenId);

      if (!tokenId) {
        toast({
          title: "Could not create card token",
          description: "Check console for details.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("Total JPY:", totalJPY);

      const checkoutItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            token: tokenId,
            amount: totalJPY,
            items: checkoutItems,
            currency: "jpy",
          },
        },
      );

      console.log("Edge function response:", data, error);

      if (error || data?.error) {
        toast({
          title: "Payment failed",
          description: data?.error || error?.message || "Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data?.success) {
        clearCart();
        navigate("/order-confirmation", {
          state: {
            orderId: data.order_id,
            chargeId: data.charge_id,
            amount: data.amount,
            currency: data.currency,
            items: checkoutItems,
          },
        });
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Unexpected error",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (authLoading) return null;

  if (!session) {
    return (
      <div className="container py-12 md:py-16 max-w-3xl">
        <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em] mb-10">
          Cart
        </h1>
        <div className="text-center py-20">
          <p className="font-heading text-[1.5rem] font-light text-foreground mb-3">
            Welcome back.
          </p>
          <p className="font-body text-[0.8rem] text-muted-foreground tracking-[0.05em] mb-8">
            Sign in to view your cart and checkout
          </p>
          <Link to="/sign-in?redirect=/cart">
            <button className="bg-primary text-primary-foreground border-none px-8 py-3 font-body text-[0.75rem] tracking-[0.12em] uppercase cursor-pointer hover:opacity-90 transition-opacity">
              SIGN IN
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <h1 className="font-heading text-[2.5rem] font-light uppercase tracking-[0.05em] mb-10 animate-reveal-up">
        Cart
      </h1>

      {items.length === 0 ? (
        <>
          {/* Hidden but in DOM so PAY.JP can mount */}
          <div className="text-center py-20 animate-reveal-up">
            <h3 className="font-heading text-[1.5rem] font-normal mb-2">
              Your cart is empty
            </h3>
            <p className="font-body text-[0.8rem] text-muted-foreground mb-6">
              Browse rooms and add furniture you love
            </p>
            <Link to="/community">
              <Button variant="amber">Browse Community</Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-reveal-up delay-100">
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-5 border-b border-border"
              >
                <div className="h-14 w-14 bg-surface border border-border flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.6rem] text-muted-foreground">
                    3D
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[0.85rem] text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="font-body text-[0.75rem] text-accent">
                    ${item.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-11 w-11 border border-border flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-body text-[0.8rem] w-6 text-center tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-11 w-11 border border-border flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
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

          {/* Card details section */}
          <div className="pt-2">
            <label className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground block mb-3">
              Card Details
            </label>

            {payjpError && (
              <p className="font-body text-[0.8rem] text-destructive mb-2">
                {payjpError}
              </p>
            )}

            <div
              id="payjp-card-element"
              style={{
                background: "transparent",
                minHeight: "60px",
                height: "60px",
                width: "100%",
                display: "block",
                borderBottom: "1px solid var(--border)",
                paddingTop: "8px",
                paddingBottom: "8px",
                overflow: "visible",
              }}
            />

            {!payjpReady && !payjpError && (
              <p className="font-body text-[0.7rem] text-muted-foreground">
                Loading card form...
              </p>
            )}
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex justify-between font-body text-[0.8rem]">
              <span className="text-muted-foreground uppercase tracking-[0.08em]">
                Subtotal
              </span>
              <span className="tabular-nums">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-body text-[0.75rem]">
              <span className="text-muted-foreground uppercase tracking-[0.08em]">
                Total (JPY)
              </span>
              <span className="tabular-nums text-accent">
                ¥{totalJPY.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-heading text-[1.2rem]">Total</span>
              <span className="font-heading text-[1.5rem] text-accent tabular-nums">
                ¥{totalJPY.toLocaleString()}
              </span>
            </div>
            <Button
              variant="amber"
              className="w-full min-h-[52px]"
              size="lg"
              onClick={handleCheckout}
              disabled={loading || !payjpReady || items.length === 0}
            >
              {loading
                ? "Processing payment…"
                : !payjpReady
                  ? "Loading payment form…"
                  : "Proceed to Checkout"}
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
