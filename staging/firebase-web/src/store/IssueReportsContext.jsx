import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/config";
import {
  ISSUES_TABLE,
  fetchIssues,
  insertIssue,
  updateIssueRow,
  uploadAttachment,
  makeRef,
} from "../supabase/complaintsApi";

// Software issue reports — "something in the app is broken".
//
// Raised from the farmer portal, the public portal, or by a PDMA officer,
// and triaged by the super-admin in the Admin Portal (/admin-portal/issues).
// Same Supabase-first + localStorage-fallback approach as ComplaintsContext.

const STORAGE_KEY = "agriwatch_issue_reports_v1";
const IssueReportsContext = createContext(null);

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota errors
  }
}

export function IssueReportsProvider({ children }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(false);

  const goOffline = useCallback((err) => {
    offlineRef.current = true;
    setOffline(true);
    setError(err || null);
    setIssues(readLocal());
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await fetchIssues();
      offlineRef.current = false;
      setOffline(false);
      setError(null);
      setIssues(rows);
    } catch (err) {
      console.error("Couldn't load issue reports from Supabase:", err);
      goOffline(err);
    } finally {
      setLoading(false);
    }
  }, [goOffline]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("issue-reports-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ISSUES_TABLE },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function addIssue({
    reporterName,
    reporterEmail = null,
    role = "farmer",
    district = null,
    area,
    severity = "Medium",
    title,
    description,
    screenshot = null,
    userId = null,
  }) {
    let screenshotUrl = null;
    if (screenshot instanceof File) {
      screenshotUrl = await uploadAttachment(screenshot, "issues");
    } else if (typeof screenshot === "string") {
      screenshotUrl = screenshot;
    }

    if (!offlineRef.current) {
      try {
        const created = await insertIssue({
          reporterName,
          reporterEmail,
          reporterRole: role,
          district,
          area,
          severity,
          title,
          description,
          screenshotUrl,
          userId,
        });
        setIssues((prev) =>
          prev.some((i) => i.dbId === created.dbId) ? prev : [created, ...prev]
        );
        return created.id;
      } catch (err) {
        console.error("Couldn't save issue report to Supabase:", err);
        goOffline(err);
      }
    }

    const local = {
      dbId: null,
      id: makeRef("BUG"),
      reporter: reporterName,
      email: reporterEmail || "",
      role,
      district: district || "",
      area,
      severity,
      title,
      description,
      screenshot: screenshotUrl,
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      status: "Open",
      adminNote: "",
      handledBy: "",
      userId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    setIssues((prev) => {
      const next = [local, ...prev];
      writeLocal(next);
      return next;
    });
    return local.id;
  }

  async function updateIssue(id, { status, adminNote, handledBy = "" }) {
    const target = issues.find((i) => i.id === id || i.dbId === id);
    if (!target) return;

    const nextStatus = status ?? target.status;
    const note = adminNote === undefined ? target.adminNote : adminNote;

    setIssues((prev) => {
      const next = prev.map((i) =>
        i.id === target.id ? { ...i, status: nextStatus, adminNote: note, handledBy } : i
      );
      if (offlineRef.current) writeLocal(next);
      return next;
    });

    if (offlineRef.current || !target.dbId) return;

    try {
      await updateIssueRow(target.dbId, {
        status: nextStatus,
        admin_note: note,
        handled_by: handledBy || target.handledBy || null,
      });
    } catch (err) {
      console.error("Couldn't update issue report in Supabase:", err);
      setError(err);
      load();
      throw err;
    }
  }

  return (
    <IssueReportsContext.Provider
      value={{ issues, loading, error, offline, addIssue, updateIssue, reload: load }}
    >
      {children}
    </IssueReportsContext.Provider>
  );
}

export function useIssueReports() {
  const ctx = useContext(IssueReportsContext);
  if (!ctx) throw new Error("useIssueReports must be used within IssueReportsProvider");
  return ctx;
}
