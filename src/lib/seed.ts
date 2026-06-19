/**
 * src/lib/seed.ts
 *
 * Firebase removed. Seed data is pre-loaded via the SQL backup file.
 * This function is a no-op kept for compatibility with App.tsx.
 */

export async function seedInitialData() {
 // Mark as seeded — data is loaded via connectit_db_backup_utf8.sql
 const SEED_KEY ="connectit_seed_done_v1";
 if (!localStorage.getItem(SEED_KEY)) {
 localStorage.setItem(SEED_KEY,"1");
 }
}
