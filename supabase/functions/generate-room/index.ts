import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Read secret (will be used when Claude integration is implemented)
    const _anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received description:", description);

    // Hardcoded mock response — replace with Claude API call later
    const mockResponse = {
      room: {
        description: "Mock room pending Claude integration",
        items: [
          {
            furniture_id: "placeholder-001",
            name: "Sample Bed",
            x: 0,
            y: 0,
            z: 0,
            rotation_y: 0,
          },
        ],
      },
    };

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-room error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
