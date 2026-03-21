import type { FurnitureDetail } from "@/lib/edgeFunctions";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  item: FurnitureDetail;
  onBack: () => void;
}

export default function FurnitureDetailPanel({ item, onBack }: Props) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      thumbnailUrl: item.thumbnail_url ?? "",
    });
    toast({ title: "Added to cart" });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Back button */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onBack}
          className="bg-transparent border-none text-muted-foreground font-body text-[0.7rem] tracking-[0.1em] uppercase cursor-pointer flex items-center gap-1.5 p-0 hover:text-foreground transition-colors"
        >
          ← BACK TO ROOM
        </button>
      </div>

      {/* Item image */}
      <div className="w-full aspect-[4/3] bg-surface border-b border-border overflow-hidden shrink-0">
        {item.thumbnail_url && item.thumbnail_url !== "PENDING_UPLOAD" ? (
          <img
            src={item.thumbnail_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-heading text-base italic text-muted-foreground">
              Image coming soon
            </span>
          </div>
        )}
      </div>

      {/* Item details */}
      <div className="p-5 flex-1 overflow-y-auto">
        {/* Category tag */}
        {item.category && (
          <span className="font-body text-[0.6rem] tracking-[0.15em] uppercase text-muted-foreground border border-border px-2 py-0.5 inline-block mb-3">
            {item.category}
          </span>
        )}

        {/* Name */}
        <h2 className="font-heading text-[1.6rem] font-normal text-foreground mb-2 leading-tight">
          {item.name}
        </h2>

        {/* Price */}
        <p className="font-heading text-[1.4rem] text-accent mb-4">
          {formatPrice(item.price)}
        </p>

        {/* Dimensions */}
        {(item.real_width || item.real_depth || item.real_height) && (
          <div className="bg-surface border border-border p-3 mb-4">
            <p className="font-body text-[0.65rem] tracking-[0.1em] uppercase text-muted-foreground mb-2">
              DIMENSIONS
            </p>
            <p className="font-body text-[0.8rem] text-foreground">
              {item.real_width && `W ${item.real_width}m`}
              {item.real_depth && ` · D ${item.real_depth}m`}
              {item.real_height && ` · H ${item.real_height}m`}
            </p>
          </div>
        )}

        {/* Style tags */}
        {item.style_tags && item.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {item.style_tags.map((tag: string) => (
              <span
                key={tag}
                className="font-body text-[0.6rem] tracking-[0.08em] uppercase border border-border text-muted-foreground px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="font-body text-[0.8rem] text-muted-foreground leading-relaxed mb-6 italic">
          Detailed description coming soon.
        </p>
      </div>

      {/* Add to cart pinned */}
      <div className="p-4 border-t border-border shrink-0">
        <button
          onClick={handleAdd}
          className="w-full bg-accent text-primary-foreground border-none py-3.5 font-body text-[0.75rem] tracking-[0.12em] uppercase cursor-pointer hover:bg-accent-hover transition-colors"
        >
          ADD TO CART
        </button>
      </div>
    </div>
  );
}
