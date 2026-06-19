/**
 * src/lib/firebase-app-stub.ts
 *
 * Stub for firebase/app imports — Firebase has been fully removed.
 */

export function initializeApp(_config: any, _name?: string): any {
 return {};
}

export function getApp(_name?: string): any {
 return {};
}

export function getApps(): any[] {
 return [];
}

export type FirebaseApp = any;
export type FirebaseOptions = any;
