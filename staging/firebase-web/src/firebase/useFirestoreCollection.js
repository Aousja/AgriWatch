import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./config";

// Subscribes to a Firestore collection in real time — any document added,
// edited, or removed on the mobile app's side shows up here automatically,
// no refresh needed. orderByField is optional; pass null to skip ordering
// if the collection doesn't have that field (avoids a Firestore error).
//
// Assumes the caller is already authenticated (the Admin Portal route is
// gated behind Google Sign-In before this ever renders) — this hook just
// reads, it doesn't manage auth itself.
export function useFirestoreCollection(collectionName, orderByField = "createdAt") {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let q;
    try {
      q = orderByField
        ? query(collection(db, collectionName), orderBy(orderByField, "desc"))
        : collection(db, collectionName);
    } catch (e) {
      setError(e);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(`Firestore error reading "${collectionName}":`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderByField]);

  return { data, loading, error };
}
