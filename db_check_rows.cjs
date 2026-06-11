const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'connectit_db'
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM work_notes LIMIT 5');
    console.log('work_notes rows:', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

run();
