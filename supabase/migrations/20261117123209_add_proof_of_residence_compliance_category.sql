-- Add Proof of Residence as compliance category c5 without resetting existing ticks.
alter table public.compliance_items
  drop constraint if exists compliance_items_item_key_check;
alter table public.compliance_items
  add constraint compliance_items_item_key_check
  check (item_key in ('c0','c1','c2','c3','c4','c5','g0','g1','g2','g3','g4'));

-- Keep uploads private to the member's own user-ID/category folder; extend access to c5.
drop policy if exists mzan_compliance_docs_member_insert on storage.objects;
create policy mzan_compliance_docs_member_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='mzanconnect-compliance-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[2]=any(array['c0','c1','c2','c3','c4','c5']::text[])
  and coalesce(array_length(storage.foldername(name),1),0)=2
  and lower(storage.extension(name))=any(array['pdf','png','jpg','jpeg','docx']::text[])
);
drop policy if exists mzan_compliance_docs_member_read on storage.objects;
create policy mzan_compliance_docs_member_read
on storage.objects for select to authenticated
using (
  bucket_id='mzanconnect-compliance-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[2]=any(array['c0','c1','c2','c3','c4','c5']::text[])
  and coalesce(array_length(storage.foldername(name),1),0)=2
);
