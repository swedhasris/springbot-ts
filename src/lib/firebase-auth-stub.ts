/**
 * src/lib/firebase-auth-stub.ts
 *
 * Stub for firebase/auth imports. Firebase Auth has been removed.
 * All authentication is handled by the Spring Boot REST API (/api/auth/login).
 *
 * This file is aliased as"firebase/auth" in vite.config.ts so that any
 * remaining import from"firebase/auth" gracefully no-ops.
 */

/** No-op — Firebase Auth has been removed. */
export async function createUserWithEmailAndPassword(
 _auth: any,
 _email: string,
 _password: string
): Promise<any> {
 // Return a fake UserCredential so callers don't crash
 return {
 user: {
 uid:"local_" + Date.now(),
 email: _email,
 displayName: null,
 },
 };
}

/** No-op — Firebase Auth has been removed. */
export async function updateProfile(_user: any, _profile: any): Promise<void> {
 // No-op: display name is set via the REST API
}

/** No-op — Firebase Auth has been removed. */
export function onAuthStateChanged(_auth: any, _callback: any): () => void {
 // Never fire — authentication state is managed via localStorage
 return () => {};
}

/** No-op — Firebase Auth has been removed. */
export async function signOut(_auth: any): Promise<void> {
 // localStorage cleanup is handled by AuthContext
}

/** No-op */
export async function signInAnonymously(_auth: any): Promise<any> {
 return { user: { uid:"anon_" + Date.now(), email: null } };
}

/** No-op */
export async function signInWithEmailAndPassword(
 _auth: any,
 _email: string,
 _password: string
): Promise<any> {
 return { user: { uid:"local_" + Date.now(), email: _email } };
}

/** No-op */
export function getAuth(_app?: any): any {
 return { currentUser: null };
}

/** No-op */
export function connectAuthEmulator(_auth: any, _url: string): void {}

export const GoogleAuthProvider = class {};
export const EmailAuthProvider = class {};
