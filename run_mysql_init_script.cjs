const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Connecting to MySQL on port 3307...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '',
      multipleStatements: true
    });
    console.log('Connected! Dropping connectit_db if exists...');
    await connection.query('DROP DATABASE IF EXISTS connectit_db');
    
    console.log('Reading mysql-init.sql...');
    const sqlPath = path.join(__dirname, 'mysql-init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing mysql-init.sql...');
    await connection.query(sql);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
