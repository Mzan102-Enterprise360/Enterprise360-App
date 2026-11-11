import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { makeHandler, verifyYoco } from "../supabase/functions/mzan-yoco-sandbox/checkout.mjs";

const origin = "https://mzan102-enterprise360.github.io";
const base = "https://example.supabase.co/functions/v1/mzan-yoco-sandbox";
const testKey = "sk_test_fixture_only";
const signingBytes = Buffer.from("test fixture only - 32 bytes long");
const secret = "whsec_" + signingBytes.toString("base64");
const user = { id: "owner", app_metadata: { mzanconnect_role: "owner" } };
const attempts = [];
let savedSecret = null;
let registrationCount = 0;
let webhookCalls = 0;
const attempt = { plan: "premium", attempt: "1e1d3447-7195-47ea-a5ec-4c16b2691eca", amount: 1 };
const db = {
  from(table) {
    if (table === "mzan_yoco_test_webhook_setup") return { insert: async () => ({}) };
    assert.equal(table, "membership_plans");
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { monthly_amount_cents: 49900, currency: "ZAR" } }) }) }) };
  },
  async rpc(name, args) {
    if (name === "mzan_yoco_test_signing_secret") {
      if (args) savedSecret = args.p_secret;
      return { data: savedSecret };
    }
    if (name === "mzan_record_yoco_test_checkout") {
      assert.equal(args.p_amount, 49900);
      assert.equal(args.p_checkout, "ch_test123");
      attempts.push(args.p_reference);
      return {};
    }
    if (name === "mzan_complete_yoco_test_payment") {
      assert.deepEqual(args, { p_checkout: "ch_test123", p_payment: "pay_1", p_amount: 49900, p_currency: "ZAR", p_succeeded: true });
      webhookCalls++;
      return { data: "complete" };
    }
    throw Error("Unexpected RPC");
  }
};
const handler = makeHandler({
  db, testKey, webhookUrl: base + "/webhook",
  authenticate: async token => token === "owner" ? user : token === "member" ? { id: "member" } : null
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(options.headers.authorization, "Bearer " + testKey);
  const body = JSON.parse(options.body);
  if (url.endsWith("/webhooks")) {
    registrationCount++;
    assert.equal(body.url, base + "/webhook");
    return Response.json({ mode: "test", url: body.url, secret }, { status: 201 });
  }
  assert(url.endsWith("/checkouts"));
  assert.equal(body.amount, 49900);
  assert.equal(options.headers["Idempotency-Key"], "owner:" + attempt.attempt);
  return Response.json({ id: "ch_test123", redirectUrl: "https://c.yoco.com/checkout/test123" });
};
const post = token => new Request(base, {
  method: "POST", headers: { origin, authorization: "Bearer " + token }, body: JSON.stringify(attempt)
});
function signed(body, timestamp = Math.floor(Date.now() / 1000)) {
  const id = "webhook_1";
  const hmac = createHmac("sha256", signingBytes).update(id + "." + timestamp + "." + body).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": String(timestamp), "webhook-signature": "v2,invalid v1," + hmac };
}
const webhook = (body, headers) => new Request(base + "/webhook", { method: "POST", headers, body });
try {
  const preflight = await handler(new Request(base, { method: "OPTIONS", headers: { origin } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal((await handler(post("bad"))).status, 401);
  assert.equal((await handler(post("member"))).status, 403);
  const checkout = await handler(post("owner"));
  assert.equal(checkout.status, 200);
  assert.equal((await checkout.json()).redirect_url, "https://c.yoco.com/checkout/test123");
  assert.equal((await handler(post("owner"))).status, 200);
  assert.equal(registrationCount, 1);
  assert.equal(attempts[0], attempts[1]);
  const event = { type: "payment.succeeded", payload: {
    mode: "test", status: "succeeded", currency: "ZAR", amount: 49900, id: "pay_1",
    metadata: { checkoutId: "ch_test123" }
  } };
  const raw = JSON.stringify(event);
  const headers = signed(raw);
  assert.equal(await verifyYoco(new Headers(headers), new TextEncoder().encode(raw), secret), true);
  assert.equal((await handler(webhook(raw + " ", headers))).status, 401);
  assert.equal((await handler(webhook(raw, signed(raw, Math.floor(Date.now() / 1000) - 181)))).status, 401);
  assert.equal((await handler(webhook(raw, headers))).status, 200);
  assert.equal(webhookCalls, 1);
  const live = JSON.stringify({ ...event, payload: { ...event.payload, mode: "live" } });
  assert.equal((await handler(webhook(live, signed(live)))).status, 200);
  assert.equal(webhookCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Sandbox checkout: owner access, server price, retry, authentic webhook, stale and tampered events, test mode isolation passed.");
