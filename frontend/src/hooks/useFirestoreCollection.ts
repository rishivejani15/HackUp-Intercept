import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentData,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFirestoreCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      let unsubscribeSnapshot: (() => void) | null = null;

      const startListener = () => {
        if (unsubscribeSnapshot) {
          return;
        }

        const colRef = collection(db, collectionName);
        const q = query(colRef, ...constraints);

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const items: T[] = [];
            snapshot.forEach((doc) => {
              items.push({ ...(doc.data() as object), id: doc.id, _docId: doc.id } as T);
            });
            setData(items);
            setError(null);
            setLoading(false);
          },
          (err) => {
            const message = String(err?.message || "");
            const networkFailure =
              message.includes("ERR_NAME_NOT_RESOLVED") ||
              message.includes("ERR_INTERNET_DISCONNECTED") ||
              message.includes("firestore.googleapis.com") ||
              message.includes("WebChannelConnection");

            if (networkFailure) {
              setError(
                new Error(
                  "Cannot reach Firestore due to network issues. Reconnecting automatically when your connection is restored."
                )
              );
              if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
              }
            } else {
              setError(err);
            }

            console.error(`Error fetching collection ${collectionName}:`, err);
            setLoading(false);
          }
        );
      };

      const onOnline = () => {
        setLoading(true);
        startListener();
      };

      const onOffline = () => {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        setError(new Error("You appear to be offline. Firestore sync is unavailable."));
        setLoading(false);
      };

      if (typeof window !== "undefined") {
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        onOffline();
      } else {
        startListener();
      }

      return () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        }
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
      };
    } catch (err: any) {
      console.error(`Unexpected error setting up listener for ${collectionName}:`, err);
      setError(err);
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(constraints)]);

  return { data, loading, error };
}
