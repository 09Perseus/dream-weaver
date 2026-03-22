import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const validFloorTextures = ["chess", "darkoak", "marble", "tatami"];
const validWallTextures = [
  "japanese_bamboo_pattern",
  "japanese_sakura_pattern",
  "japanese_seigaiha_pattern",
  "japanese_shoji_pattern",
];

async function callClaudeWithTimeout(prompt: string, apiKey: string): Promise<string> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Claude API timeout")), 25000)
  );

  const claudeFetch = fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const res = await Promise.race([claudeFetch, timeout]);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders,
    });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return new Response(JSON.stringify({ error: "description is required" }), {
        status: 400, headers: jsonHeaders,
      });
    }

    console.log("Received description:", description);

    // Fetch furniture catalogue
    console.log("Fetching furniture library...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: furnitureItems, error: dbError } = await sb
      .from("furniture_items")
      .select("*");

    if (dbError || !furnitureItems) {
      throw new Error(`Failed to fetch furniture: ${dbError?.message}`);
    }

    console.log("Furniture items loaded:", furnitureItems.length);

    if (furnitureItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Furniture library is empty. Please add items to the furniture_items table first." }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Build prompt
    const catalogue = JSON.stringify(
      furnitureItems.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        style_tags: f.style_tags,
        width: f.real_width,
        depth: f.real_depth,
        height: f.real_height,
        price: f.price,
      }))
    );

    const basePrompt = `You are an expert interior designer AI. The user wants this room:
"${description}"

Available furniture library:
${catalogue}

Select 6 to 8 items from the library that best match the user's description and style. Return their placement in the room as a JSON object.

ROOM RULES:
- The room is 10 x 10 metres. The centre is x=0, z=0.
- x must be between -4 and 4
- z must be between -4 and 4
- y is always 0 (floor level)
- rotation is in degrees: 0, 90, 180, or 270 only
- scale is always 1
- Minimum 0.8 metres gap between any two item centres
- Account for each item's width and depth when placing — do not let bounding boxes overlap

PLACEMENT STYLE RULES:
- Beds go against the back wall: z near -4, centred on x=0
- Sofas face the room centre, z near 2 to 3
- Coffee tables go directly in front of sofas, z near 0 to 1
- Dining tables go centre room x=0, z=0
- Chairs cluster around tables or face sofas
- Floor lamps go in corners or beside beds and sofas
- Plants go in corners, x near ±3.5, z near ±3.5
- Rugs go flat at room centre under the main seating area
- Shelves go against side walls, x near -4 or 4

STYLE MATCHING:
- Prioritise items whose style_tags overlap with the user's description keywords
- Mix categories naturally — a bedroom needs a bed, lamp, plant, rug at minimum
- A living room needs a sofa, coffee table, lamp, plant, rug at minimum

TEXTURE SELECTION (REQUIRED):
You MUST also select a floor texture and a wall texture that best match the room style.

floor_texture must be exactly one of: chess, darkoak, marble, tatami
wall_texture must be exactly one of: japanese_bamboo_pattern, japanese_sakura_pattern, japanese_seigaiha_pattern, japanese_shoji_pattern

Style guidance for textures:
- Japanese / zen rooms: tatami floor, japanese_shoji_pattern or japanese_bamboo_pattern wall
- Luxury / modern rooms: marble floor, japanese_shoji_pattern wall
- Rustic / farmhouse rooms: darkoak floor, japanese_bamboo_pattern wall
- Scandinavian / minimalist rooms: darkoak floor, japanese_shoji_pattern wall
- Romantic / feminine rooms: marble floor, japanese_sakura_pattern wall
- Traditional / classic rooms: chess floor, japanese_seigaiha_pattern wall
- Cozy / warm rooms: darkoak floor, japanese_seigaiha_pattern wall
- Nature / botanical rooms: tatami floor, japanese_bamboo_pattern wall

Return ONLY a raw JSON object (no explanation, no markdown, no code fences) in exactly this format:
{
  "items": [
    { "id": "bed_001", "x": 0, "y": 0, "z": -3.5, "rotation": 0, "scale": 1 },
    { "id": "lamp_001", "x": 1.5, "y": 0, "z": -3, "rotation": 0, "scale": 1 }
  ],
  "floor_texture": "darkoak",
  "wall_texture": "japanese_shoji_pattern"
}`;

    // Retry logic: up to 2 attempts
    let rawText = "";
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log("Claude attempt:", attempt);
      try {
        const promptToSend = attempt === 1
          ? basePrompt
          : basePrompt + "\n\nIMPORTANT: Return ONLY a raw JSON object. No markdown, no code fences, no explanation.";

        console.log("Calling Claude API...");
        rawText = await callClaudeWithTimeout(promptToSend, anthropicKey);
        console.log("Claude responded, parsing...");
        console.log("Claude raw response:", rawText);
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`Claude attempt ${attempt} failed:`, lastError.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (lastError) {
      const isTimeout = lastError.message.includes("timeout");
      return new Response(
        JSON.stringify({
          error: isTimeout
            ? "Room generation timed out. Please try again."
            : "Claude API failed after 2 attempts",
          details: lastError.message,
        }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Clean markdown formatting before parsing
    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Claude returned invalid JSON");
    }

    // Support both old array format and new object format
    const itemsArray = Array.isArray(parsed) ? parsed : parsed.items;

    if (!Array.isArray(itemsArray)) {
      throw new Error("Claude response does not contain an items array");
    }

    // Validate and sanitize items
    const validIds = new Set(furnitureItems.map((f) => f.id));

    const validated = itemsArray
      .filter((item: any) => {
        if (!item.id || !validIds.has(item.id)) return false;
        if (typeof item.x !== "number" || typeof item.z !== "number") return false;
        if (item.x < -5 || item.x > 5 || item.z < -5 || item.z > 5) return false;
        return true;
      })
      .map((item: any) => ({
        id: item.id,
        x: Math.max(-4, Math.min(4, item.x)),
        y: 0,
        z: Math.max(-4, Math.min(4, item.z)),
        rotation: [0, 90, 180, 270].includes(item.rotation) ? item.rotation : 0,
        scale: 1,
      }));

    console.log("Validated items:", validated.length);

    if (validated.length < 3) {
      return new Response(
        JSON.stringify({ error: "Claude did not return enough valid furniture items" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Extract and validate textures with safe defaults
    const floorTexture = validFloorTextures.includes(parsed.floor_texture)
      ? parsed.floor_texture
      : "darkoak";
    const wallTexture = validWallTextures.includes(parsed.wall_texture)
      ? parsed.wall_texture
      : "japanese_shoji_pattern";

    console.log("Floor texture:", floorTexture, "Wall texture:", wallTexture);

    // Build furniture detail map for selected items
    const selectedIds = new Set(validated.map((i: any) => i.id));
    const furniture = furnitureItems.filter((f) => selectedIds.has(f.id));

    return new Response(JSON.stringify({
      items: validated,
      furniture,
      floor_texture: `/furnitures/Textures/${floorTexture}.png`,
      wall_texture: `/furnitures/Textures/${wallTexture}.png`,
    }), {
      status: 200, headers: jsonHeaders,
    });
  } catch (error) {
    console.error("generate-room error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
