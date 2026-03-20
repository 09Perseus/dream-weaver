import { useState } from "react";
import { Save, Undo, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomCanvas from "@/components/RoomCanvas";
import { mockFurniture, furnitureCategories, type FurnitureItem } from "@/data/mockData";

export default function EditRoom() {
  const [activeCategory, setActiveCategory] = useState("Beds");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const filteredFurniture = mockFurniture.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border/50 px-4 py-2 flex items-center gap-2 bg-surface/50 backdrop-blur-sm">
        <Button variant="amber" size="sm">
          <Save className="h-4 w-4" />
          Save
        </Button>
        <Button variant="outline" size="sm">
          <Undo className="h-4 w-4" />
          Undo
        </Button>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </Button>
        <div className="flex-1" />
        <Button variant="amber-outline" size="sm">
          <Share2 className="h-4 w-4" />
          Post to Community
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Furniture Picker Sidebar */}
        <aside className="w-72 border-r border-border/50 flex flex-col">
          <div className="flex flex-wrap gap-1 p-3 border-b border-border/50">
            {furnitureCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  activeCategory === cat
                    ? "bg-amber text-amber-foreground"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredFurniture.map((item) => (
              <FurniturePickerItem
                key={item.id}
                item={item}
                selected={selectedItem === item.id}
                onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
              />
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 p-4">
          <RoomCanvas className="w-full h-full min-h-[400px]" />
        </div>
      </div>
    </div>
  );
}

function FurniturePickerItem({
  item,
  selected,
  onClick,
}: {
  item: FurnitureItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all active:scale-[0.97] ${
        selected
          ? "border-amber bg-amber/10"
          : "border-border/50 bg-surface hover:border-amber/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-amber font-semibold">${item.price}</p>
        </div>
      </div>
    </button>
  );
}
