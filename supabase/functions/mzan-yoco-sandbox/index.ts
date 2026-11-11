import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { makeHandler } from "./checkout.mjs";

const url = Deno.env.get("SUPABASE_URL")!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);

Deno.serve(makeHandler({
  db,
  authenticate: async (token: string) => {
    const { data, error } = await auth.auth.getUser(token);
    return error ? null : data.user;
  },
  testKey: Deno.env.get("YOCO_TEST_SECRET_KEY"),
  webhookUrl: url + "/functions/v1/mzan-yoco-sandbox/webhook",
}));
