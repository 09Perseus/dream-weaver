import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

async function callClaude(prompt: string, apiKey: string, retries = 1): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    }

    console.error(`Claude API attempt ${attempt + 1} failed: ${res.status} ${await res.text()}`);
    if (attempt === retries) {
      throw new Error(`Claude API failed after ${retries + 1} attempts`);
    }
  }
  throw new Error("Unreachable");
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

    // Fetch furniture catalogue from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: furnitureItems, error: dbError } = await sb
      .from("furniture_items")
      .select("*");

    if (dbError || !furnitureItems) {
      throw new Error(`Failed to fetch furniture: ${dbError?.message}`);
    }

    console.log(`Fetched ${furnitureItems.length} furniture items`);

    if (furnitureItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No furniture items in the catalogue. Please seed the furniture_items table first." }),
        { status: 400, headers: jsonHeaders }
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

    const prompt = `You are an expert interior designer AI. The user wants this room:
"${description}"

Available furniture library:
${catalogue}

Select 6 to 8 items from the library that best match the user's description and style. Return their placement in the room as a JSON array.

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

Return ONLY a raw JSON array. No explanation, no markdown, no code fences. Exactly this format:
[
  { "id": "bed_001", "x": 0, "y": 0, "z": -3.5, "rotation": 0, "scale": 1 },
  { "id": "lamp_001", "x": 1.5, "y": 0, "z": -3, "rotation": 0, "scale": 1 }
]`;

    // Call Claude (with 1 retry)
    const rawText = await callClaude(prompt, anthropicKey);
    console.log("Claude raw response:", rawText);

    // Clean markdown formatting before parsing
    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse & validate
    let items: any[];
    try {
      items = JSON.parse(cleaned);
    } catch {
      throw new Error("Claude returned invalid JSON");
    }

    if (!Array.isArray(items)) {
      throw new Error("Claude response is not an array");
    }

    const validIds = new Set(furnitureItems.map((f) => f.id));

    for (const item of items) {
      if (!item.id || item.x == null || item.y == null || item.z == null || item.rotation == null || item.scale == null) {
        throw new Error(`Item missing required fields: ${JSON.stringify(item)}`);
      }
      if (!validIds.has(item.id)) {
        throw new Error(`Item id "${item.id}" not found in furniture catalogue`);
      }
    }

    // Build furniture detail map for selected items
    const selectedIds = new Set(items.map((i) => i.id));
    const furniture = furnitureItems.filter((f) => selectedIds.has(f.id));

    return new Response(JSON.stringify({ items, furniture }), {
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
