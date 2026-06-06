const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:\\Users\\HP\\Downloads\\tickect\\timesheet.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Tables:", tables.map(t => t.name));
  for (const table of tables) {
    const tableName = table.name;
    db.all(`SELECT * FROM \`${tableName}\` LIMIT 10`, [], (err, rows) => {
      if (err) {
        console.error(`Error reading table ${tableName}:`, err);
        return;
      }
      if (rows.length > 0) {
        console.log(`Table ${tableName} has ${rows.length} rows. First row:`, rows[0]);
      } else {
        console.log(`Table ${tableName} is empty.`);
      }
    });
  }
});
