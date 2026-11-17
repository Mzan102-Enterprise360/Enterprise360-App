-- Member compliance documents: private Supabase Storage, maximum 10 MB per file.
-- Documents are only visible to the signed-in uploader; no public access.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'mzanconnect-compliance-documents','mzanconnect-compliance-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
on conflict (id) do nothing;

create policy mzan_compliance_docs_member_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='mzanconnect-compliance-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[2]=any(array['c0','c1','c2','c3','c4']::text[])
  and coalesce(array_length(storage.foldername(name),1),0)=2
  and lower(storage.extension(name))=any(array['pdf','png','jpg','jpeg','docx']::text[])
);

create policy mzan_compliance_docs_member_read
on storage.objects for select to authenticated
using (
  bucket_id='mzanconnect-compliance-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[2]=any(array['c0','c1','c2','c3','c4']::text[])
  and coalesce(array_length(storage.foldername(name),1),0)=2
);
