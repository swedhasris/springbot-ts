/**
 * src/lib/firestore-fallback.ts
 *
 * Firebase has been fully removed. This file now re-exports everything from
 * the pure MySQL API client (src/lib/api.ts).
 *
 * The vite.config.ts alias `firebase/firestore` → this file remains in place
 * so all existing imports throughout the codebase continue to work.
 */
export * from"./api";
