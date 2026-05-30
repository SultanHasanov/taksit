import { useEffect, useState } from 'react';
import { subscribeCollection } from '../firebase/db';

export function useCollection(path, constraints = []) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // stringify constraints to use as dep key (simple)
  const key = JSON.stringify(constraints.map(c => c.type + (c._field?.segments?.join('.') ?? '') + (c._value ?? '')));

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCollection(path, constraints, (docs) => {
      setData(docs);
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  return { data, loading, error };
}
