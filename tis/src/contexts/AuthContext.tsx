import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInAnonymously, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { ROLE_HIERARCHY, ROLE_LABELS, Role } from "../lib/roles";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  demoLogin: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state to localStorage so standalone pages (timesheet) can read it
  useEffect(() => {
    if (user && profile) {
      localStorage.setItem('timesheet_user', JSON.stringify({
        uid: user.uid,
        name: profile.name || user.displayName || user.email?.split("@")[0] || "User",
        email: user.email,
        role: profile.role || 'user'
      }));
    } else if (!user) {
      localStorage.removeItem('timesheet_user');
    }
  }, [user, profile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Check for user session in localStorage (used by both registered users and demo users)
    const sessionStr = localStorage.getItem('demo_user');
    if (sessionStr) {
      try {
        const sessionUser = JSON.parse(sessionStr);
        setUser({
          uid: sessionUser.uid,
          email: sessionUser.email,
          displayName: sessionUser.name,
        } as User);
        setProfile(sessionUser);
        setLoading(false);

        // Subscribe to real-time Firestore updates so admin role changes apply immediately
        const docRef = doc(db, "users", sessionUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const freshData = docSnap.data();
            
            // Prevent Firestore from downgrading a higher role established by local database
            const localRole = (sessionUser.role || "user") as Role;
            const freshRole = (freshData.role || "user") as Role;
            const finalRole = (ROLE_HIERARCHY[freshRole] >= ROLE_HIERARCHY[localRole]) ? freshRole : localRole;

            setProfile({
              ...sessionUser,
              ...freshData,
              role: finalRole
            });
            
            // Update localStorage to stay in sync
            localStorage.setItem('demo_user', JSON.stringify({
              uid: freshData.uid || sessionUser.uid,
              name: freshData.name || sessionUser.name,
              email: freshData.email || sessionUser.email,
              role: finalRole,
              phone: freshData.phone || ""
            }));
          }
        }, () => {
          // Firestore listen failed — keep using cached session data
        });

        return () => { if (unsubscribeProfile) unsubscribeProfile(); };
      } catch (e) {
        localStorage.removeItem('demo_user');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Don't overwrite demo user state from localStorage
      const demoSession = localStorage.getItem('demo_user');
      if (!user && demoSession) {
        // Demo user exists, don't clear the user state
        setLoading(false);
        return;
      }

      setUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const docRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Optional: Sync name/email if they changed in Google but not in our DB
            setProfile(data);
          } else {
            // Auto-create profile if missing (Standard for Google & Email sign-ins)
            const initialProfile = {
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "User",
              email: user.email,
              role: "user", // Default role
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };
            try {
              await setDoc(docRef, initialProfile);
              setProfile(initialProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
            }
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Demo login function that works without Firebase Auth
  const demoLogin = async (role: Role) => {
    try {
      // Try Firebase anonymous auth first
      const result = await signInAnonymously(auth);
      const user = result.user;

      // Create demo profile in Firestore
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        uid: user.uid,
        name: ROLE_LABELS[role],
        email: `demo-${role}@connectit.local`,
        role: role,
        createdAt: serverTimestamp()
      });

      // Also store in localStorage as backup
      localStorage.setItem('demo_user', JSON.stringify({
        uid: user.uid,
        name: ROLE_LABELS[role],
        email: `demo-${role}@connectit.local`,
        role: role
      }));

    } catch (err: any) {
      // If Firebase fails, use localStorage mock mode
      console.warn("Firebase auth failed, using local demo mode:", err);

      const mockUid = 'demo_' + role + '_' + Date.now();
      const mockUser = {
        uid: mockUid,
        name: ROLE_LABELS[role],
        email: `demo-${role}@connectit.local`,
        role: role,
        isDemo: true
      };

      localStorage.setItem('demo_user', JSON.stringify(mockUser));

      // Manually set the user state
      setUser({
        uid: mockUid,
        email: `demo-${role}@connectit.local`,
        displayName: ROLE_LABELS[role],
      } as User);
      setProfile(mockUser);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // Ignore errors
    }
    localStorage.removeItem('demo_user');
    localStorage.removeItem('timesheet_user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, demoLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
