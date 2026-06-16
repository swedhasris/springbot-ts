const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function check() {
  const db = await open({ filename: './timesheet.sqlite', driver: sqlite3.Database });
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables in SQLite:', tables.map(t => t.name));
  await db.close();
}

check().catch(console.error);
