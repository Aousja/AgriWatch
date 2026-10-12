import { CloudOff } from "lucide-react";

// Shown when a Supabase read/write failed and the app fell back to storing
// data in this browser only. Keeps demos alive instead of showing a dead page.
export default function OfflineNotice({
  what = "records",
  error,
  title = `Not connected to Supabase — showing local ${what}.`,
  detail = (
    <>
      Anything submitted now is saved in this browser only and will not reach the PDMA or Admin
      portal. Check your <code className="font-mono">.env</code> keys and that the tables from{" "}
      <code className="font-mono">supabase/complaints_setup.sql</code> exist.
    </>
  ),
}) {
  return (
    <div className="flex items-start gap-3 border border-warn/30 bg-warn/5 rounded-xl px-4 py-3">
      <CloudOff size={16} className="text-warn shrink-0 mt-0.5" />
      <div className="text-xs text-ink/70">
        <p className="font-medium text-warn">{title}</p>
        <p className="mt-0.5">{detail}</p>
        {error?.message && <p className="mt-1 font-mono text-[10px] text-ink/45 break-all">{error.message}</p>}
      </div>
    </div>
  );
}
