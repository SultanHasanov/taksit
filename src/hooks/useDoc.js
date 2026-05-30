import { useEffect, useState } from 'react';
import { subscribeDoc } from '../firebase/db';

export function useDoc(path, id) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeDoc(path, id, (doc) => {
      setData(doc);
      setLoading(false);
    });
    return unsub;
  }, [path, id]);

  return { data, loading };
}
