import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://room-dreamweaver-65.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ✅ Authenticate
  const incomingKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("DESIGNER_API_KEY");

  if (!incomingKey || incomingKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ✅ Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { productName, quantity, customerInfo, idempotencyKey } = body;

  if (!productName || !quantity || !customerInfo?.email) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: productName, quantity, customerInfo.email" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ✅ Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ✅ Idempotency check
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ orderId: existing.id, message: "Order already exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // ✅ Find product — exact match first, then fuzzy
  let product = null;

  const { data: exactMatch } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .eq("name", productName)
    .maybeSingle();

  if (exactMatch) {
    product = exactMatch;
  } else {
    const { data: fuzzyMatch } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .ilike("name", `%${productName}%`)
      .limit(1)
      .maybeSingle();
    product = fuzzyMatch;
  }

  if (!product) {
    return new Response(
      JSON.stringify({ error: `Product not found: "${productName}"` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ✅ Create order
  const totalPrice = product.price * quantity;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: product.price,
      total_price: totalPrice,
      customer_email: customerInfo.email,
      customer_user_id: customerInfo.userId ?? null,
      shipping_address: customerInfo.shippingAddress ?? null,
      status: "pending",
      source: "3d_room_designer",
      idempotency_key: idempotencyKey ?? null,
    })
    .select()
    .single();

  if (orderError) {
    return new Response(
      JSON.stringify({ error: "Failed to create order", detail: orderError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ✅ Return success
  return new Response(
    JSON.stringify({
      success: true,
      orderId: order.id,
      productMatched: product.name,
      totalPrice,
      status: "pending",
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});