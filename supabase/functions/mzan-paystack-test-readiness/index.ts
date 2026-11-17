import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Read-only test readiness probe. It cannot initialise a payment or change a bank account.
const allowedOrigin = "https://mzan102-enterprise360.github.io";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function reply(body: Record<string, unknown>, status = 200, cors = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(cors ? { "access-control-allow-origin": allowedOrigin, "vary": "Origin" } : {})
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("origin") !== allowedOrigin) {
    return reply({ error: "Origin not allowed" }, 403);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": allowedOrigin,
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "access-control-allow-methods": "GET, OPTIONS",
      "vary": "Origin"
    } });
  }
  if (req.method !== "GET") return reply({ error: "Method not allowed" }, 405, true);
  try {
    const authorization = req.headers.get("authorization") ?? "";
    if (!/^Bearer [^\s]+$/.test(authorization)) {
      return reply({ error: "Sign in to check readiness." }, 401, true);
    }
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const token = authorization.slice("Bearer ".length);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) return reply({ error: "Sign in again." }, 401, true);
    if (userData.user.app_metadata?.mzanconnect_role !== "owner") {
      return reply({ error: "Owner only." }, 403, true);
    }
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("code,monthly_amount_cents,currency,published")
      .eq("code", "starter")
      .eq("published", true)
      .maybeSingle();
    const localPlanOkay = !planError && plan?.monthly_amount_cents === 19900 && plan?.currency === "ZAR";
    const key = Deno.env.get("PAYSTACK_TEST_SECRET_KEY") ?? "";
    const planCode = Deno.env.get("PAYSTACK_TEST_PLAN_CODE") ?? "";
    const signature = Deno.env.get("PAYSTACK_TEST_WEBHOOK_SECRET") ?? "";
    const testKeyConfigured = /^sk_test_[a-zA-Z0-9]+$/.test(key);
    const testPlanCodeConfigured = /^PLN_[a-zA-Z0-9]+$/.test(planCode);
    const webhookSecretConfigured = /^whsec_.+/.test(signature);
    let remotePlanVerified = false;
    if (testKeyConfigured && testPlanCodeConfigured && localPlanOkay) {
      try {
        const response = await fetch(
          "https://api.paystack.co/plan/" + encodeURIComponent(planCode),
          {
            method: "GET",
            headers: { "authorization": "Bearer " + key },
            signal: AbortSignal.timeout(8000)
          }
        );
        if (response.ok) {
          const result = await response.json();
          const remote = result?.data;
          remotePlanVerified =
            result?.status === true &&
            remote?.plan_code === planCode &&
            Number(remote?.amount) === 19900 &&
            remote?.currency === "ZAR" &&
            remote?.interval === "monthly";
        }
      } catch {
        // Payment settings cannot be marked ready when the provider is unreachable.
      }
    }
    return reply({
      mode: "test",
      live_payments_enabled_by_this_function: false,
      bank_account_changes: false,
      checks: {
        local_r199_plan: localPlanOkay,
        test_api_key_configured: testKeyConfigured,
        test_plan_code_configured: testPlanCodeConfigured,
        test_plan_verified_with_paystack: remotePlanVerified,
        test_webhook_signing_secret_configured: webhookSecretConfigured
      },
      ready_for_test_integration: localPlanOkay && testKeyConfigured &&
        testPlanCodeConfigured && remotePlanVerified && webhookSecretConfigured
    }, 200, true);
  } catch {
    return reply({ error: "Readiness check unavailable." }, 503, true);
  }
});
