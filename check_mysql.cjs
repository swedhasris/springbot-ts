const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'connectit_db'
  });
  
  const [rows] = await connection.query('SHOW TABLES');
  console.log('Tables in MySQL:', rows.map(r => Object.values(r)[0]));
  await connection.end();
}

check().catch(console.error);
