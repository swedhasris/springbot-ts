const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./timesheet.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Tables:", tables);
  
  db.get("SELECT COUNT(*) as count FROM tickets", [], (err, row) => {
    if (err) {
      console.error("Tickets error:", err.message);
    } else {
      console.log("Tickets count:", row.count);
    }
    
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (err) {
        console.error("Users error:", err.message);
      } else {
        console.log("Users count:", row.count);
      }
      db.close();
    });
  });
});
