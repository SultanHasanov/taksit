import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getUserProfile } from '../firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (uid) => {
    const targetUid = uid ?? user?.uid;
    if (!targetUid) {
      setProfile(null);
      return null;
    }
    const p = await getUserProfile(targetUid);
    setProfile(p);
    return p;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const role = profile?.role ?? null;
  const uid = user?.uid ?? null;
  const isSuper = role === 'superadmin';
  const ownerId = role === 'admin' ? uid : (profile?.ownerId ?? null);

  return (
    <AuthContext.Provider value={{ user, profile, role, uid, isSuper, ownerId, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
