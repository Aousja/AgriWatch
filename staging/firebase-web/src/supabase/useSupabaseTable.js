import { useEffect, useState } from "react";
import { supabase } from "./config";

// Subscribes to a Supabase (Postgres) table in real time — any row added,
// edited, or removed on the mobile app's side shows up here automatically,
// no refresh needed. orderByField is optional; pass null to skip ordering.
//
// This is a drop-in replacement for the old useFirestoreCollection(): same
// return shape ({ data, loading, error }), same two arguments. Note that
// Postgres columns are conventionally snake_case (e.g. "created_at"), not
// Firestore's camelCase ("createdAt") — check your table's actual column
// names in the Supabase Table Editor.
export function useSupabaseTable(tableName, orderByField = "created_at", refreshKey = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchRows() {
      let query = supabase.from(tableName).select("*");
      if (orderByField) query = query.order(orderByField, { ascending: false });

      const { data: rows, error: err } = await query;
      if (cancelled) return;

      if (err) {
        console.error(`Supabase error reading "${tableName}":`, err);
        setError(err);
      } else {
        setData(rows ?? []);
        setError(null);
      }
      setLoading(false);
    }

    fetchRows();

    // Real-time: re-fetch whenever a row in this table changes. (Simplest
    // correct approach — swaps the exact insert/update/delete payload for a
    // fresh read, which keeps ordering/filtering logic in one place.)
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName }, () => {
        fetchRows();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tableName, orderByField, refreshKey]);

  return { data, loading, error };
}
