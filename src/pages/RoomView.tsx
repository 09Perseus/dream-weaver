import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ShoppingCart, Plus, Share2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
import { useCart } from "@/contexts/CartContext";
import { mockCommunityPosts, type FurnitureItem } from "@/data/mockData";

const loadingMessages = [
  "Designing your room...",
  "Placing furniture...",
  "Adding finishing touches...",
  "Welcome home",
];

export default function RoomView() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(id === "new");
  const [loadingStep, setLoadingStep] = useState(0);

  const room = mockCommunityPosts.find((r) => r.id === id);
  const items: FurnitureItem[] = room?.items ?? [];

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(interval);
          setTimeout(() => setLoading(false), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAddItem = (item: FurnitureItem) => {
    addItem({ id: item.id, name: item.name, price: item.price, thumbnailUrl: item.thumbnailUrl ?? "" });
  };

  const handleAddAll = () => {
    items.forEach(handleAddItem);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-amber border-t-transparent animate-spin" />
          </div>
          <div className="space-y-2">
            {loadingMessages.map((msg, i) => (
              <p
                key={msg}
                className={`text-lg transition-all duration-500 ${
                  i === loadingStep
                    ? "text-amber font-medium"
                    : i < loadingStep
                    ? "text-muted-foreground/50"
                    : "text-transparent"
                }`}
              >
                {msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Canvas */}
      <div className="flex-1 p-4 lg:p-6">
        <RoomCanvas className="w-full h-[50vh] lg:h-[calc(100vh-7rem)]" />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border/50 p-6 space-y-6 animate-reveal-up">
        <div>
          <h2 className="text-xl font-semibold mb-1">{room?.title ?? "Generated Room"}</h2>
          <p className="text-sm text-muted-foreground">{room?.description ?? "Your custom design"}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Furniture in this room</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No furniture items yet</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/50 hover:border-amber/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-amber font-semibold">${item.price.toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleAddItem(item)} className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <Button variant="amber" className="w-full" onClick={handleAddAll}>
            <ShoppingCart className="h-4 w-4" />
            Add All to Cart
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Pencil className="h-4 w-4" />
            Edit Room
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            <Share2 className="h-4 w-4" />
            Post
          </Button>
        </div>
      </aside>
    </div>
  );
}
