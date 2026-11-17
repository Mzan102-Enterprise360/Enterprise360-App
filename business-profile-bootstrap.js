/* Restore first-time member business information after email confirmation.
 * Member changes always remain authoritative. Only INSERT when no profile exists;
 * never overwrite existing saved details with signup metadata.
 * Authentication metadata is used as a convenience for the user's own editable
 * record, never for access control or other members' records.
 */
(()=>{'use strict';
const FIELDS={
  business_name:100,registered_name:160,registration_number:50,
  contact_name:100,contact_phone:40,contact_email:160,
  sector:100,province:90,district:120,municipality:120
};
async function ensure(db,user){
 if(!db||!user?.id)return false;
 const {data,error:readError}=await db.from('business_profiles')
  .select('user_id').eq('user_id',user.id).maybeSingle();
 if(readError)throw readError;
 if(data)return false;
 const meta=user.user_metadata||{};
 const row={user_id:user.id};
 for(const [key,length] of Object.entries(FIELDS)){
  let value=(key==='sector'?meta.business_sector:meta[key])||'';
  if(key==='contact_email'&&!value)value=user.email||'';
  row[key]=typeof value==='string'?value.trim().slice(0,length):'';
 }
 if(!row.business_name)return false;
 const {error}=await db.from('business_profiles').insert(row);
 if(error&&error.code!=='23505')throw error;
 return !error;
}
window.MzanBusinessProfileBootstrap=Object.freeze({ensure});
})();
