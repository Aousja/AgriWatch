import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/config";
import {
  COMPLAINTS_TABLE,
  fetchComplaints,
  insertComplaint,
  reviewComplaint,
  reviewPdmaComplaint,
  fetchComplaintAccess,
  uploadAttachment,
} from "../supabase/complaintsApi";

const ComplaintsContext = createContext(null);

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [access, setAccess] = useState(null);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const permissions = session ? await fetchComplaintAccess() : null;
      const rows = session ? await fetchComplaints(permissions) : [];
      if (version !== loadVersion.current) return;
      setAccess(permissions);
      setComplaints(rows);
      setError(null);
    } catch (err) {
      if (version !== loadVersion.current) return;
      setComplaints([]);
      setAccess(null);
      setError(err);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(load, 0);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      ++loadVersion.current;
      setComplaints([]);
      setAccess(null);
      // The auth callback must not await another Supabase request.
      setTimeout(load, 0);
    });
    const channel = supabase
      .channel("complaints-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: COMPLAINTS_TABLE }, load)
      .subscribe();
    return () => {
      clearTimeout(initialLoad);
      // Version invalidation uses a counter, not a DOM ref captured for cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++loadVersion.current;
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function addComplaint({
    farmer, district, category, description, photo = null,
    role = "farmer", phone = null, userId = null,
  }) {
    if (!access) throw new Error('Drought reporting requires the coordinated database rollout. Refresh and try again.');
    const version = loadVersion.current;
    let photoUrl = null;
    if (photo instanceof File) photoUrl = await uploadAttachment(photo, "complaints");
    else if (typeof photo === "string") photoUrl = photo;
    const created = await insertComplaint({
      reporterName: farmer,
      reporterRole: role,
      reporterPhone: phone,
      district,
      category,
      description,
      photoUrl,
      userId,
    });
    if (version === loadVersion.current) {
      setComplaints((prev) => prev.some((c) => c.dbId === created.dbId)
        ? prev : [created, ...prev]);
    }
    return created.id;
  }

  async function reviewReport(id, action, note = '', assignee = null, reason = '') {
    const target = complaints.find((c) => c.id === id || c.dbId === id);
    if (!target?.dbId) throw new Error("Complaint is not available in Supabase.");
    if (!access?.admin && !access?.districts?.length) throw new Error('Authorized reviewer access is required.');
    const version = loadVersion.current;
    const updated = access.admin
      ? await reviewComplaint(target.dbId, action, note, assignee, reason)
      : await reviewPdmaComplaint(target.dbId, action, note);
    if (version === loadVersion.current) {
      setComplaints((prev) => prev.map((c) => c.dbId === updated.dbId ? updated : c));
    }
    return updated;
  }

  return (
    <ComplaintsContext.Provider value={{
      complaints, loading, error, offline: Boolean(error),
      addComplaint, reviewReport, access, reload: load,
    }}>
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error("useComplaints must be used within ComplaintsProvider");
  return ctx;
}
