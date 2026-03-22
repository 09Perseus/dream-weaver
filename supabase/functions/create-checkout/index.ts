// PAY.JP Checkout Edge Function
// Required secrets (set in Supabase Dashboard → Settings → Edge Functions → Secrets):
//   PAYJP_SECRET_KEY = sk_test_...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const body = await req.json();
    const { token, amount, items, currency = "jpy" } = body;

    // 1. Validate required fields
    if (!token || !amount || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token, amount, items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate amount
    if (!Number.isInteger(amount) || amount < 50) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get current user (optional — guest checkout allowed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    let user = null;
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      user = data?.user ?? null;
    }

    // 4. PAY.JP charge
    console.log("Processing PAY.JP charge...");
    console.log(`Charge amount: ${amount} ${currency}`);

    const payjpKey = Deno.env.get("PAYJP_SECRET_KEY");
    if (!payjpKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(payjpKey + ":");

    const response = await fetch("https://api.pay.jp/v1/charges", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        card: token,
        amount: amount.toString(),
        currency,
        capture: "true",
        description: `RoomAI Order — ${items.length} items`,
      }),
    });

    const charge = await response.json();
    console.log("PAY.JP response received");

    // 5. Check for PAY.JP error
    if (charge.error) {
      return new Response(
        JSON.stringify({ error: charge.error.message, code: charge.error.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Insert order if charge succeeded
    if (charge.paid === true) {
      // Calculate original USD total from cart items (not the JPY charge amount)
      const originalTotal = items.reduce(
        (sum: number, item: any) => sum + ((item.price ?? 0) * (item.quantity ?? 1)),
        0
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          items,
          total_usd: originalTotal,
          stripe_payment_intent_id: charge.id,
          status: "completed",
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("Order save error:", orderError);
        return new Response(
          JSON.stringify({ error: "Payment succeeded but order save failed", charge_id: charge.id }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Order saved: ${order.id}`);

      // 7. Return success
      return new Response(
        JSON.stringify({
          success: true,
          charge_id: charge.id,
          order_id: order.id,
          amount: charge.amount,
          currency: charge.currency,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Payment was not completed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Payment processing failed", details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
