import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface OrderItem {
  name?: string;
  quantity?: number;
}

interface Order {
  id: string;
  created_at: string | null;
  status: string;
  total_usd: number;
  items: OrderItem[] | null;
  stripe_payment_intent_id: string | null;
}

export default function Orders() {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);

      if (!session) {
        navigate("/sign-in?redirect=/orders");
        return;
      }

      supabase
        .from("orders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error: fetchError }) => {
          console.log("Orders:", data?.length, fetchError);
          if (fetchError) {
            setError(true);
          } else {
            setOrders((data as unknown as Order[]) ?? []);
          }
          setLoading(false);
        });
    });

    return () => clearTimeout(timeout);
  }, []);

  const formatJPY = (amount: number) =>
    "¥" + Math.round(amount).toLocaleString();

  const statusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return { borderColor: "hsl(var(--success, 142 71% 45%))", color: "hsl(var(--success, 142 71% 45%))" };
      case "refunded":
        return { borderColor: "hsl(var(--destructive))", color: "hsl(var(--destructive))" };
      default:
        return { borderColor: "hsl(var(--accent))", color: "hsl(var(--accent))" };
    }
  };

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <h1 className="font-heading text-[1.8rem] md:text-[2.2rem] uppercase tracking-[0.15em] font-light text-foreground mb-10">
        My Orders
      </h1>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border bg-surface p-6 animate-skeleton-pulse">
              <div className="flex justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-3 bg-muted w-32" />
                  <div className="h-3 bg-muted w-24" />
                </div>
                <div className="h-6 bg-muted w-20" />
              </div>
              <div className="h-4 bg-muted w-48" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-20">
          <p className="font-body text-[0.85rem] text-muted-foreground mb-4">
            Could not load orders. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-body text-[0.75rem] tracking-[0.12em] uppercase text-accent border border-accent px-6 py-2 hover:bg-accent hover:text-background transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20">
          <p className="font-body text-[0.9rem] text-foreground mb-2">No orders yet</p>
          <p className="font-body text-[0.75rem] text-muted-foreground mb-6">
            Items you purchase will appear here
          </p>
          <Link
            to="/"
            className="font-body text-[0.75rem] tracking-[0.12em] uppercase text-accent border border-accent px-6 py-2 hover:bg-accent hover:text-background transition-colors"
          >
            Explore Rooms
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div>
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const badge = statusStyle(order.status);
            return (
              <div
                key={order.id}
                className="bg-surface border border-border p-6 mb-4"
              >
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <p className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">
                      ORDER #{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    {order.created_at && (
                      <p className="font-body text-[0.75rem] text-muted-foreground mt-1">
                        {format(new Date(order.created_at), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-body text-[0.65rem] uppercase tracking-[0.08em] px-2 py-0.5 border rounded-full"
                      style={badge}
                    >
                      {order.status.toUpperCase()}
                    </span>
                    <span className="font-heading text-[1.3rem] text-accent">
                      {formatPrice(order.total_usd)}
                    </span>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mb-3">
                    {items.map((item, i) => (
                      <p key={i} className="font-body text-[0.8rem] text-foreground">
                        {item.name ?? "Item"} × {item.quantity ?? 1}
                      </p>
                    ))}
                  </div>
                )}

                {order.stripe_payment_intent_id && (
                  <p className="font-body text-[0.65rem] text-muted-foreground font-mono">
                    Charge: {order.stripe_payment_intent_id}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
