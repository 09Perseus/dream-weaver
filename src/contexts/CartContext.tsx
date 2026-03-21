import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  thumbnailUrl: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const STORAGE_KEY = "roomai_cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const skipSupabaseSync = useRef(false);

  // Save to localStorage + Supabase on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}

    if (skipSupabaseSync.current) {
      skipSupabaseSync.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await (supabase as any)
        .from("carts")
        .upsert(
          {
            user_id: session.user.id,
            items: items,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }, 500);

    return () => clearTimeout(timer);
  }, [items]);

  // Merge Supabase cart on sign-in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const { data } = await (supabase as any)
            .from("carts")
            .select("items")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (data?.items && Array.isArray(data.items)) {
            const supabaseItems = data.items as unknown as CartItem[];
            skipSupabaseSync.current = true;
            setItems((prev) => {
              const supabaseIds = new Set(supabaseItems.map((i) => i.id));
              const localOnly = prev.filter((i) => !supabaseIds.has(i.id));
              return [...localOnly, ...supabaseItems];
            });
          }
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    }
  }, []);

  const clearCart = useCallback(async () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("carts")
        .upsert(
          {
            user_id: session.user.id,
            items: [] as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
