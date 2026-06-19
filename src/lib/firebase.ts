/**
 * src/lib/firebase.ts
 *
 * Firebase has been fully removed. This file is a compatibility stub so that
 * pages importing { db, auth, firebaseAvailable, handleFirestoreError, OperationType }
 * from this module continue to compile and run without changes.
 *
 * All data operations now go through the Spring Boot REST API (port 3000).
 */

// Firebase is not available — all data goes through the MySQL REST API
export const firebaseAvailable = false;

// Stub auth object — no real Firebase Auth
export const auth = {
 currentUser: null as any,
 onAuthStateChanged: (_callback: any) => () => {},
};

// Stub db object — Firestore functions receive this but ignore it
// (all Firestore calls are aliased to src/lib/api.ts which uses REST APIs)
export const db = {} as any;

// ---- Error handling stubs ----

export enum OperationType {
 CREATE ="create",
 UPDATE ="update",
 DELETE ="delete",
 LIST ="list",
 GET ="get",
 WRITE ="write",
}

export interface FirestoreErrorInfo {
 error: string;
 operationType: OperationType;
 path: string | null;
 authInfo: {
 userId: string | undefined;
 email: string | null | undefined;
 emailVerified: boolean | undefined;
 isAnonymous: boolean | undefined;
 tenantId: string | null | undefined;
 providerInfo: {
 providerId: string;
 displayName: string | null;
 email: string | null;
 photoUrl: string | null;
 }[];
 };
}

/** No-op — Firebase has been removed; errors are just logged. */
export function handleFirestoreError(
 error: unknown,
 operationType: OperationType,
 path: string | null
) {
 console.error("[API Error]", operationType, path, error instanceof Error ? error.message : error);
}
