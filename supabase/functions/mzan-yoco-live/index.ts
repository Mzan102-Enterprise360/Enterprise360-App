import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { makeHandler, ensureWebhook } from "./checkout.mjs";
const url = Deno.env.get("SUPABASE_URL")!;
const options = { auth: { autoRefreshToken:false, persistSession:false } };
const db = createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,options);
const auth = createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,options);
const liveKey=Deno.env.get("YOCO_LIVE_SECRET_KEY")||Deno.env.get("YOCO_SECRET_KEY");
if(liveKey?.startsWith("sk_live_")) await ensureWebhook(db,liveKey,url+"/functions/v1/mzan-yoco-live/webhook");
Deno.serve(makeHandler({db,
 authenticate: async (token:string)=>{const {data,error}=await auth.auth.getUser(token);return error?null:data.user;},
 liveKey,
 webhookUrl:url+"/functions/v1/mzan-yoco-live/webhook"
}));
