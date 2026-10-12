import { supabase } from "./config";
import { DROUGHT_REPORT_CATEGORIES, complaintFromRow } from './reportContract';
export { complaintFromRow } from './reportContract';

// Central place for every Supabase read/write to do with complaints and
// software issue reports. The React contexts (ComplaintsContext /
// IssueReportsContext) call into here, so the SQL-ish details live in one
// file and the pages stay clean.
//
// Table + bucket names must match supabase/complaints_setup.sql.

export const COMPLAINTS_TABLE = "complaints";
export const ISSUES_TABLE = "issue_reports";
export const PHOTO_BUCKET = "complaint-photos";

export const COMPLAINT_STATUS = ['Submitted', 'Under Review', 'Assigned for PDMA review', 'Resolved'];
export const ISSUE_STATUS = ["Open", "In Progress", "Resolved", "Closed"];
export const ISSUE_SEVERITY = ["Low", "Medium", "High", "Critical"];
export const ISSUE_AREAS = [
  "Login / Sign-up",
  "Dashboard",
  "Drought Map",
  "Alerts & Notifications",
  "Complaints",
  "Reports & Charts",
  "Mobile App",
  "Other",
];

// Short, readable reference like CMP-7F3A21 — easier for a farmer to quote
// over the phone than a raw UUID.
export function makeRef(prefix) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `${prefix}-${stamp}${rand}`;
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that image file."));
    reader.readAsDataURL(file);
  });
}

// Upload an attachment to Supabase Storage and return its public URL.
// If the bucket doesn't exist yet (or storage rejects the upload), fall back
// to an inline data: URL so submitting a complaint never hard-fails on the
// photo — the report itself is the important part.
export async function uploadAttachment(file, folder = "complaints") {
  if (!file) return null;
  try {
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const path = `${folder}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn("Storage upload failed — embedding the image instead:", err?.message);
    try {
      return await toDataUrl(file);
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Complaints (farmer / public field complaints)
// ---------------------------------------------------------------------------

// Database row -> the shape the existing pages already render.


export async function fetchComplaintAccess() {
  const { data, error } = await supabase.rpc('agriwatch_report_access_v1');
  if (error) throw new Error('Drought report access is unavailable. The coordinated database rollout is required.');
  return data;
}

export async function fetchComplaints(access) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];
  let query = supabase
    .from(COMPLAINTS_TABLE)
    .select('*');
  if (!access?.admin) {
    if (access?.districts?.length) {
      // RLS returns own reports plus explicitly permitted assignments.
      // The PDMA table filters those rows again with isPermittedAssignment.
    } else {
      query = query.eq('user_id', authData.user.id);
    }
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(complaintFromRow);
}

export async function insertComplaint({
  reporterName,
  reporterRole = "farmer",
  reporterPhone = null,
  district,
  category,
  description,
  photoUrl = null,
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in before submitting a drought report.');
  if (!DROUGHT_REPORT_CATEGORIES.includes(category) || !district?.trim() || description?.trim().length < 10) {
    throw new Error('Choose a drought category and district, and describe the situation (at least 10 characters).');
  }
  const ref = makeRef("CMP");
  const { data, error } = await supabase
    .from(COMPLAINTS_TABLE)
    .insert({
      ref,
      user_id: authData.user.id,
      reporter_name: reporterName,
      reporter_role: reporterRole,
      reporter_phone: reporterPhone,
      district,
      category,
      description,
      photo_url: photoUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return complaintFromRow(data);
}

export async function reviewComplaint(dbId, action, note = '', assignee = null, reason = '') {
  const { data, error } = await supabase.rpc('agriwatch_review_report_v1', {
    report_id: dbId, action, note, assignee, reason,
  });
  if (error) throw error;
  return complaintFromRow(Array.isArray(data) ? data[0] : data);
}

export async function fetchReportReviewers() {
  const { data, error } = await supabase.rpc('agriwatch_report_reviewers_v1');
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Issue reports (software glitches)
// ---------------------------------------------------------------------------

export function issueFromRow(row) {
  return {
    dbId: row.id,
    id: row.ref || row.id,
    reporter: row.reporter_name || "Anonymous",
    email: row.reporter_email || "",
    role: row.reporter_role || "farmer",
    district: row.district || "",
    area: row.area || "Other",
    severity: row.severity || "Medium",
    title: row.title || "(no title)",
    description: row.description || "",
    screenshot: row.screenshot_url || null,
    pageUrl: row.page_url || "",
    userAgent: row.user_agent || "",
    status: row.status || "Open",
    adminNote: row.admin_note || "",
    handledBy: row.handled_by || "",
    userId: row.user_id || null,
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    createdAt: row.created_at,
  };
}

export async function fetchIssues() {
  const { data, error } = await supabase
    .from(ISSUES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(issueFromRow);
}

export async function insertIssue({
  reporterName,
  reporterEmail = null,
  reporterRole = "farmer",
  district = null,
  area,
  severity = "Medium",
  title,
  description,
  screenshotUrl = null,
  userId = null,
}) {
  const ref = makeRef("BUG");
  const { data, error } = await supabase
    .from(ISSUES_TABLE)
    .insert({
      ref,
      user_id: userId,
      reporter_name: reporterName,
      reporter_email: reporterEmail,
      reporter_role: reporterRole,
      district,
      area,
      severity,
      title,
      description,
      screenshot_url: screenshotUrl,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      status: "Open",
    })
    .select()
    .single();
  if (error) throw error;
  return issueFromRow(data);
}

export async function updateIssueRow(dbId, patch) {
  const { data, error } = await supabase
    .from(ISSUES_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", dbId)
    .select()
    .single();
  if (error) throw error;
  return issueFromRow(data);
}

export async function reviewPdmaComplaint(dbId, action, note = '') {
  if (!['start_review', 'respond', 'resolve'].includes(action)) throw new Error('Invalid PDMA action.');
  const { data, error } = await supabase.rpc('agriwatch_pdma_review_report_v1', { report_id: dbId, action, note });
  if (error) throw error;
  return complaintFromRow(Array.isArray(data) ? data[0] : data);
}
