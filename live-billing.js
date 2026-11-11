async function initializeLiveBilling(client, user, founder) {
  const panel=document.getElementById('liveCheckout');
  const status=document.getElementById('liveCheckoutStatus');
  const buttons=[...panel.querySelectorAll('[data-plan]')];
  const owner=user.app_metadata?.mzanconnect_role==='owner';
  if(owner || founder?.pilot_status==='active') return;
  panel.hidden=false;
  const attempts=new Map();
  const returned=new URLSearchParams(location.search).get('payment');
  try {
    const {data:subscriptions,error}=await client.from('membership_subscriptions')
      .select('plan_code,status,current_period_end').eq('user_id',user.id)
      .eq('status','active').gt('current_period_end',new Date().toISOString())
      .order('current_period_end',{ascending:false}).limit(1);
    if(error)throw error;
    const current=subscriptions?.[0];
    if(current){
      const name={starter:'Starter',growth:'Growth',premium:'Premium'}[current.plan_code]||'Paid';
      document.getElementById('status').textContent=name+' membership — Active';
      document.getElementById('explanation').textContent='Paid until '+new Date(current.current_period_end).toLocaleDateString('en-ZA')+'. No automatic renewal.';
      status.textContent='Your membership is active. Your verified payment receipt appears below.';
      return;
    }
    status.textContent=returned==='returned'?'Checking payment confirmation. Use Refresh payment status if your receipt is still pending.':
      returned==='failed'||returned==='cancelled'?'Checkout did not complete. You may try again.':'Choose your monthly membership.';
    buttons.forEach(button=>{
      button.disabled=false;
      button.addEventListener('click',async()=>{
        buttons.forEach(b=>b.disabled=true);
        status.textContent='Opening secure Yoco checkout…';
        try{
          const plan=button.dataset.plan;
          if(!attempts.has(plan))attempts.set(plan,crypto.randomUUID());
          const {data,error}=await client.functions.invoke('mzan-yoco-live',{body:{plan,attempt:attempts.get(plan)}});
          if(error){
            const details=await error.context?.json?.().catch(()=>null);
            throw Error(details?.error||'Unable to open checkout. Please try again.');
          }
          const url=new URL(data.redirect_url);
          if(url.origin!=='https://c.yoco.com'||url.username||url.password)throw Error('Invalid checkout link.');
          location.assign(url.href);
        }catch(error){status.textContent=error.message;buttons.forEach(b=>b.disabled=false);}
      });
    });
  }catch{status.textContent='Unable to check your membership. Refresh before making a payment.';}
}
