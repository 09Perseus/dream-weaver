export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  price: number;
  thumbnailUrl?: string;
}

export interface RoomDesign {
  id: string;
  title: string;
  description: string;
  author: string;
  authorInitial: string;
  likeCount: number;
  thumbnailUrl?: string;
  items: FurnitureItem[];
}

export const furnitureCategories = [
  "Beds", "Sofas", "Tables", "Chairs", "Lamps", "Plants", "Rugs", "Shelves",
];

export const mockFurniture: FurnitureItem[] = [
  { id: "f1", name: "Kyoto Platform Bed", category: "Beds", price: 1249 },
  { id: "f2", name: "Tatami Low Frame", category: "Beds", price: 899 },
  { id: "f3", name: "Cloud Linen Sofa", category: "Sofas", price: 2180 },
  { id: "f4", name: "Arc Sectional", category: "Sofas", price: 3450 },
  { id: "f5", name: "Walnut Coffee Table", category: "Tables", price: 645 },
  { id: "f6", name: "Terrazzo Side Table", category: "Tables", price: 385 },
  { id: "f7", name: "Woven Dining Chair", category: "Chairs", price: 420 },
  { id: "f8", name: "Leather Accent Chair", category: "Chairs", price: 1120 },
  { id: "f9", name: "Paper Lantern Floor Lamp", category: "Lamps", price: 275 },
  { id: "f10", name: "Brass Arc Lamp", category: "Lamps", price: 590 },
  { id: "f11", name: "Fiddle Leaf Fig", category: "Plants", price: 85 },
  { id: "f12", name: "Snake Plant Trio", category: "Plants", price: 65 },
  { id: "f13", name: "Moroccan Wool Rug", category: "Rugs", price: 780 },
  { id: "f14", name: "Jute Round Rug", category: "Rugs", price: 340 },
  { id: "f15", name: "Oak Floating Shelf", category: "Shelves", price: 195 },
  { id: "f16", name: "Modular Wall Unit", category: "Shelves", price: 1650 },
];

export const mockCommunityPosts: RoomDesign[] = [
  {
    id: "r1",
    title: "Cozy Japanese Bedroom",
    description: "Warm minimalist bedroom with tatami elements",
    author: "Mika T.",
    authorInitial: "M",
    likeCount: 247,
    items: [mockFurniture[0], mockFurniture[8], mockFurniture[12]],
  },
  {
    id: "r2",
    title: "Scandinavian Living Room",
    description: "Light and airy living space with clean lines",
    author: "Erik S.",
    authorInitial: "E",
    likeCount: 183,
    items: [mockFurniture[2], mockFurniture[4], mockFurniture[9]],
  },
  {
    id: "r3",
    title: "Industrial Loft Studio",
    description: "Raw concrete meets warm wood and brass",
    author: "Diane R.",
    authorInitial: "D",
    likeCount: 156,
    items: [mockFurniture[7], mockFurniture[5], mockFurniture[15]],
  },
  {
    id: "r4",
    title: "Bohemian Reading Nook",
    description: "Layered textures and warm earthy tones",
    author: "Ava L.",
    authorInitial: "A",
    likeCount: 312,
    items: [mockFurniture[13], mockFurniture[10], mockFurniture[14]],
  },
  {
    id: "r5",
    title: "Modernist Dining Space",
    description: "Clean geometry with statement lighting",
    author: "Nolan K.",
    authorInitial: "N",
    likeCount: 98,
    items: [mockFurniture[6], mockFurniture[5], mockFurniture[9]],
  },
  {
    id: "r6",
    title: "Desert Retreat Bedroom",
    description: "Terracotta and sand palette with natural linen",
    author: "Sol M.",
    authorInitial: "S",
    likeCount: 201,
    items: [mockFurniture[1], mockFurniture[12], mockFurniture[11]],
  },
];

export const mockMyRooms: RoomDesign[] = [
  mockCommunityPosts[0],
  mockCommunityPosts[2],
  mockCommunityPosts[4],
];
