// Real PostgreSQL RLS/RPC checks in a disposable PGlite database. No network/data writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '../../.local/auth-report-tests/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
const ids = Array.from({length: 7}, (_,i) => `00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const [admin, farmer, other, officer, wrongOfficer, replacement, signupOnly] = ids;
let checks = 0;
const check = (value, expected) => { assert.deepEqual(value, expected); checks++; };
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
  $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.jwt(), auth.uid() to authenticated;
  create table public.admins(user_id uuid primary key);
  create function public.is_agriwatch_admin(candidate uuid) returns boolean language sql stable security definer as $$
    select exists(select 1 from public.admins where user_id = candidate)
  $$;
  create table public.website_signup_requests(user_id uuid, role text, status text);
  create table public.access_requests(id uuid default gen_random_uuid(), status text default 'pending');
  grant all on public.access_requests to authenticated;
  create table public.complaints (
    id uuid primary key default gen_random_uuid(), ref text not null unique, user_id uuid,
    reporter_name text, reporter_role text, reporter_phone text, district text,
    category text, description text, photo_url text,
    status text not null default 'Under Review',
    constraint complaints_status_check check(status in ('Under Review','Forwarded','Resolved')),
    resolution_note text, handled_by text, created_at timestamptz default now(), updated_at timestamptz default now()
  );
  alter table public.complaints enable row level security;
  grant select,insert,update on public.complaints to authenticated;
  create policy "authenticated create complaint" on public.complaints for insert to authenticated with check (user_id=auth.uid());
  create policy "authenticated read complaints" on public.complaints for select to authenticated using (true);
  create policy "staff update complaints" on public.complaints for update to authenticated using (
    public.is_agriwatch_admin(auth.uid()) or exists (
      select 1 from public.website_signup_requests where user_id=auth.uid() and role='pdma' and status='approved'
    )
  );
`);
for (const id of ids) await db.query('insert into auth.users values ($1)', [id]);
await db.query('insert into admins values ($1)', [admin]);
await db.query("insert into website_signup_requests values ($1,'pdma','approved')", [signupOnly]);
await db.query("insert into complaints(ref,user_id,category,district,description) values ('CMP-LEGACY',$1,'Crop damage','Lahore','Original legacy description')",[farmer]);
for (const file of ['20261007_m08_shared_complaints.sql','20261008_m08_drought_report_review.sql','20261009_m08_pdma_report_actions.sql','20261009_trusted_access_request_status.sql']) {
  await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
}
await db.query('insert into agriwatch_pdma_report_permissions(user_id,district,verified_by) values ($1,$2,$3),($4,$5,$3),($6,$2,$3)',[officer,'Lahore',admin,wrongOfficer,'Multan',replacement]);

async function as(claims, query, params=[]) {
  await db.exec('begin; set local role authenticated;');
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
    const result=await db.query(query,params);
    await db.exec('commit'); return result.rows;
  } catch(error) { await db.exec('rollback'); throw error; }
}
const web = id => ({sub:id,role:'authenticated',iss:'https://gtbfmrefgwodphjurvdq.supabase.co/auth/v1'});
const mobile = {sub:'firebase-fixture-owner',role:'authenticated',iss:'https://securetoken.google.com/agriwatch-pakistan',aud:'agriwatch-pakistan'};
const category='Observed drought conditions affecting a community';
async function denied(claims,sql,params=[]) { await assert.rejects(as(claims,sql,params)); checks++; }
async function action(actor,id,verb,note='') { return as(web(actor),'select * from public.agriwatch_pdma_review_report_v1($1,$2,$3)',[id,verb,note]); }

const [report] = await as(mobile,'insert into complaints(firebase_uid,reporter_role,district,category,description) values ($1,$2,$3,$4,$5) returning *',[mobile.sub,'farmer','Lahore',category,'Water shortage affecting the community.']);
assert.match(report.ref,/^CMP-/); checks++;
// A new simulated session represents process restart: read the same persisted row/reference.
const [reloaded]=await as({...mobile},'select * from complaints where id=$1',[report.id]);
check(reloaded.ref,report.ref);
check((await as(web(other),'select id from complaints where id=$1',[report.id])).length,0);
check((await as({...mobile,sub:'different-firebase-user'},'select id from complaints where id=$1',[report.id])).length,0);
await denied({...mobile,iss:'https://attacker.invalid'},'insert into complaints(firebase_uid,category,district,description) values ($1,$2,$3,$4)',[mobile.sub,category,'Lahore','Spoofed issuer must fail.']);
await denied({...mobile,aud:'other-project'},'insert into complaints(firebase_uid,category,district,description) values ($1,$2,$3,$4)',[mobile.sub,category,'Lahore','Wrong audience must fail.']);
await denied(mobile,"insert into complaints(firebase_uid,category,district,description,status) values ($1,$2,$3,$4,'Resolved')",[mobile.sub,category,'Lahore','Forged resolution must fail.']);
await denied(web(other),'select public.agriwatch_review_report_v1($1,$2)',[report.id,'start_review']);
await as(web(admin),'select public.agriwatch_review_report_v1($1,$2)',[report.id,'start_review']);
await as(web(admin),'select public.agriwatch_review_report_v1($1,$2,$3)',[report.id,'respond','Admin acknowledged the situation.']);
check((await as(mobile,'select resolution_note from complaints where id=$1',[report.id]))[0].resolution_note,'Admin acknowledged the situation.');
await denied(web(admin),'select public.agriwatch_review_report_v1($1,$2,$3,$4,$5)',[report.id,'assign','',wrongOfficer,'Serious drought assessment.']);
await as(web(admin),'select public.agriwatch_review_report_v1($1,$2,$3,$4,$5)',[report.id,'assign','',officer,'Serious drought assessment.']);
check((await as(web(officer),'select id from complaints where id=$1',[report.id])).length,1);
for(const id of [wrongOfficer,signupOnly,other]) {
  check((await as(web(id),'select id from complaints where id=$1',[report.id])).length,0);
  await denied(web(id),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'respond','Unauthorized response']);
}
await denied(web(officer),'select public.agriwatch_review_report_v1($1,$2,$3,$4,$5)',[report.id,'assign','',replacement,'Officer cannot assign reports.']);
await denied(web(officer),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'respond','Must start review first.']);
await action(officer,report.id,'start_review');
await action(officer,report.id,'respond','PDMA reviewed local water conditions.');
check((await as(mobile,'select pdma_response_note from complaints where id=$1',[report.id]))[0].pdma_response_note,'PDMA reviewed local water conditions.');
check((await as(web(officer),"update complaints set resolution_note='bypass' where id=$1 returning id",[report.id])).length,0);
await denied(web(officer),"update complaints set pdma_response_note='bypass' where id=$1",[report.id]);
await db.query('update agriwatch_pdma_report_permissions set active=false where user_id=$1',[officer]);
check((await as(web(officer),'select id from complaints where id=$1',[report.id])).length,0);
await denied(web(officer),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'resolve','Revoked officer']);
await db.query('update agriwatch_pdma_report_permissions set active=true where user_id=$1',[officer]);
await as(web(admin),'select public.agriwatch_review_report_v1($1,$2,$3,$4,$5)',[report.id,'assign','',replacement,'A new verified officer is responsible.']);
check((await as(web(officer),'select id from complaints where id=$1',[report.id])).length,0);
await denied(web(officer),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'resolve','Reassigned away']);
await denied(web(replacement),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'respond','Prior review cannot transfer authority.']);
await action(replacement,report.id,'start_review');
await action(replacement,report.id,'resolve','The assigned officer recorded resolution.');
check((await as(mobile,'select status, resolved_by from complaints where id=$1',[report.id]))[0],{status:'Resolved',resolved_by:replacement});
await denied(web(replacement),'select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'respond','Cannot modify a completed report']);
const [legacy]=await as(web(farmer),"select ref,category,description,status from complaints where ref='CMP-LEGACY'");
check(legacy,{ref:'CMP-LEGACY',category:'Crop damage',description:'Original legacy description',status:'Under Review'});
for(const oldCategory of ['Pest infestation','Crop Failure','Well / Tubewell Dried Up']) {
  const [old]=await as(web(farmer),"insert into complaints(user_id,category,status) values ($1,$2,'Under Review') returning category",[farmer,oldCategory]);
  check(old.category,oldCategory);
}
await denied(web(other),"update access_requests set status='approved'");
await db.exec('set role anon');
await assert.rejects(db.query('select * from complaints')); checks++;
await assert.rejects(db.query('select public.agriwatch_pdma_review_report_v1($1,$2,$3)',[report.id,'respond','Anonymous'])); checks++;
await db.exec('reset role');
console.log(`PASS: ${checks} PostgreSQL report workflow, ownership, compatibility, and authorization assertions.`);
await db.close();
