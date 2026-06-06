const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'connectit_db'
  });

  console.log("Connected to MySQL!");
  const [tables] = await connection.query("SHOW TABLES");
  const tableNames = tables.map(r => Object.values(r)[0]);
  console.log("Tables:", tableNames);

  for (const tableName of tableNames) {
    try {
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      for (const row of rows) {
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('brown') || rowStr.includes('diverse')) {
          console.log(`Match in MySQL table ${tableName}:`, row);
        }
      }
    } catch (err) {
      console.error(`Error reading ${tableName}:`, err.message);
    }
  }

  await connection.end();
}

run().catch(console.error);
