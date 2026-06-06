const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:\\Users\\HP\\Downloads\\tic sys\\Nexus_Project_Ticket\\timesheet.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  for (const table of tables) {
    const tableName = table.name;
    db.all(`SELECT * FROM \`${tableName}\``, [], (err, rows) => {
      if (err) return;
      for (const row of rows) {
        const rowStr = JSON.stringify(row);
        if (rowStr.toLowerCase().includes('brown') || rowStr.toLowerCase().includes('diverse')) {
          console.log(`Match in table ${tableName}:`, row);
        }
      }
    });
  }
});
