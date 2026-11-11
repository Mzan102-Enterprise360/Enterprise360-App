const origin = "https://mzan102-enterprise360.github.io";
const billing = origin + "/Enterprise360-App/billing.html";
const yoco = "https://payments.yoco.com/api";
const plans = new Set(["starter", "growth", "premium"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checkoutId = /^ch_[\w-]{1,120}$/;
const encoder = new TextEncoder();

function bytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

export async function verifyYoco(headers, raw, secret, now = Date.now()) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp") ?? "";
  const signatures = headers.get("webhook-signature") ?? "";
  if (!id || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 180) return false;
  if (!secret?.startsWith("whsec_") || signatures.length > 4096) return false;
  const prefix = encoder.encode(id + "." + timestamp + ".");
  const signed = new Uint8Array(prefix.length + raw.length);
  signed.set(prefix);
  signed.set(raw, prefix.length);
  let key;
  try {
    key = await crypto.subtle.importKey("raw", bytes(secret.slice(6)), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  } catch {
    return false;
  }
  for (const signature of signatures.split(/\s+/)) {
    if (!signature.startsWith("v1,")) continue;
    try {
      if (await crypto.subtle.verify("HMAC", key, bytes(signature.slice(3)), signed)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function paymentNotification(event) {
  const payment = event?.payload;
  const succeeded = event?.type === "payment.succeeded";
  if ((!succeeded && event?.type !== "payment.failed") || payment?.mode !== "live") return null;
  if (payment.status !== (succeeded ? "succeeded" : "failed") || payment.currency !== "ZAR") return null;
  if (!Number.isSafeInteger(payment.amount) || payment.amount < 200 || payment.amount > 2147483647) return null;
  if (typeof payment.id !== "string" || !/^[\w-]{1,128}$/.test(payment.id)) return null;
  if (typeof payment.metadata?.checkoutId !== "string" || !checkoutId.test(payment.metadata.checkoutId)) return null;
  return {
    p_checkout: payment.metadata.checkoutId, p_payment: payment.id,
    p_amount: payment.amount, p_currency: payment.currency, p_succeeded: succeeded
  };
}

export function trustedCheckout(result) {
  if (typeof result?.id !== "string" || !checkoutId.test(result.id) || typeof result.redirectUrl !== "string") return null;
  try {
    const url = new URL(result.redirectUrl);
    if (url.origin !== "https://c.yoco.com" || url.username || url.password) return null;
    return { id: result.id, redirectUrl: url.href };
  } catch {
    return null;
  }
}

function response(body, status = 200, cors = false) {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (cors) headers["access-control-allow-origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

function providerRequest(path, key, body, idempotencyKey) {
  const headers = { authorization: "Bearer " + key, "content-type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return fetch(yoco + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
}

async function signingSecret(db) {
  const result = await db.rpc("mzan_yoco_live_signing_secret");
  if (result.error) throw Error("Signing configuration unavailable");
  return result.data;
}

export async function ensureWebhook(db, key, url) {
  if (await signingSecret(db)) return;
  const setup = db.from("mzan_yoco_live_webhook_setup");
  const reservation = await setup.insert({ singleton: true });
  if (reservation.error) {
    if (reservation.error.code === "23505" && await signingSecret(db)) return;
    throw Error("Yoco live webhook setup needs review.");
  }

  // Keep the reservation if registration may have succeeded. The secret is returned only once.
  const result = await providerRequest("/webhooks", key, { name: "MzanConnect Live", url });
  if (!result.ok) {
    if ([400, 401, 403, 422, 429].includes(result.status)) await setup.delete().eq("singleton", true);
    throw Error("Yoco rejected live webhook registration.");
  }
  const hook = await result.json();
  if (hook?.mode !== "live" || hook.url !== url || typeof hook.secret !== "string" || !hook.secret.startsWith("whsec_")) {
    throw Error("Yoco returned an invalid live webhook configuration.");
  }
  const saved = await db.rpc("mzan_yoco_live_signing_secret", { p_secret: hook.secret });
  if (saved.error || !saved.data) throw Error("Unable to save the live webhook signing key.");
}

export function makeHandler({ db, authenticate, liveKey, webhookUrl }) {
  return async request => {
    const pathname = new URL(request.url).pathname;
    if (pathname.endsWith("/status") && request.method === "GET") {
      try {return response({ready:Boolean(liveKey?.startsWith("sk_live_") && await signingSecret(db))},200,true);}
      catch {return response({ready:false},503,true);}
    }
    const webhook = pathname.endsWith("/webhook");
    if (webhook) {
      if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
      try {
        const raw = new Uint8Array(await request.arrayBuffer());
        if (raw.length > 65536) return response({ error: "Payload too large" }, 413);
        const secret = await signingSecret(db);
        if (!secret) return response({ error: "Webhook configuration unavailable" }, 503);
        if (!(await verifyYoco(request.headers, raw, secret))) return response({ error: "Invalid signature" }, 401);
        const payment = paymentNotification(JSON.parse(new TextDecoder().decode(raw)));
        if (!payment) return response({ received: true });
        const result = await db.rpc("mzan_complete_yoco_live_payment", payment);
        if (result.error || result.data === "unknown") return response({ error: "Unable to record payment" }, 503);
        if(result.data === "mismatch") return response({error:"Payment details do not match"},400);
        return response({ received: true });
      } catch {
        return response({ error: "Unable to process webhook" }, 503);
      }
    }

    if (request.headers.get("origin") !== origin) return response({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization, apikey, x-client-info, content-type",
        "access-control-allow-methods": "POST, OPTIONS", vary: "Origin"
      } });
    }
    const json = (body, status = 200) => response(body, status, true);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      const authorization = request.headers.get("authorization") ?? "";
      const user = authorization.startsWith("Bearer ") ? await authenticate(authorization.slice(7)) : null;
      if (!user) return json({ error: "Sign in again to continue to payment." }, 401);
      if (!user.email_confirmed_at) return json({ error: "Confirm your email before paying." }, 403);
      if (user.app_metadata?.mzanconnect_role === "owner") return json({ error: "Owner access is free. No payment is needed." }, 409);
      const { data: founder, error: founderError } = await db.from("founding_memberships").select("pilot_status").eq("user_id",user.id).maybeSingle();
      if (founderError) return json({error:"Unable to verify founding membership."},503);
      if (founder?.pilot_status === "active") return json({error:"Your founding membership is free. No payment is needed."},409);
      const { data: active, error: activeError } = await db.from("membership_subscriptions").select("id").eq("user_id",user.id).eq("status","active").gt("current_period_end",new Date().toISOString()).limit(1);
      if (activeError) return json({error:"Unable to verify membership."},503);
      if (active?.length) return json({error:"Your paid membership is already active. Renew after it expires."},409);
      if (!liveKey?.startsWith("sk_live_")) return json({ error: "The saved Yoco live key is unavailable." }, 503);
      let input;
      try { input = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
      if (!plans.has(input?.plan) || typeof input?.attempt !== "string" || !uuid.test(input.attempt)) {
        return json({ error: "Select a valid plan and try again." }, 400);
      }
      const { data: plan, error } = await db.from("membership_plans")
        .select("monthly_amount_cents,currency").eq("code", input.plan).eq("published", true).single();
      if (error || !plan || plan.currency !== "ZAR" || !Number.isSafeInteger(plan.monthly_amount_cents)) {
        return json({ error: "Plan pricing is unavailable." }, 503);
      }

      try { await ensureWebhook(db, liveKey, webhookUrl); }
      catch (error) { return json({ error: error.message }, 503); }
      const reference = "live:" + user.id + ":" + input.plan + ":" + input.attempt;
      const result = await providerRequest("/checkouts", liveKey, {
        amount: plan.monthly_amount_cents, currency: plan.currency,
        successUrl: billing + "?payment=returned", cancelUrl: billing + "?payment=cancelled",
        failureUrl: billing + "?payment=failed", description: "MzanConnect " + input.plan + " — one month, no automatic renewal"
      }, reference);
      if (!result.ok) return json({ error: "Yoco could not open a live checkout." }, 502);
      const checkout = trustedCheckout(await result.json());
      if (!checkout) return json({ error: "Yoco returned an invalid checkout link." }, 502);
      const record = await db.rpc("mzan_record_yoco_live_checkout", {
        p_user: user.id, p_plan: input.plan, p_amount: plan.monthly_amount_cents,
        p_reference: reference, p_checkout: checkout.id
      });
      if (record.error) return json({ error: "Could not record the live checkout." }, 503);
      return json({ redirect_url: checkout.redirectUrl });
    } catch {
      return json({ error: "Live checkout is temporarily unavailable." }, 503);
    }
  };
}

