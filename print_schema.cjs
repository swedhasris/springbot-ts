const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'connectit_db'
  });
  
  const tables = [
    'settings_categories',
    'settings_subcategories',
    'settings_service_providers',
    'settings_group_members',
    'settings_groups'
  ];
  
  for (const table of tables) {
    try {
      const [rows] = await connection.query(`SHOW CREATE TABLE ${table}`);
      console.log(rows[0]['Create Table']);
      console.log('\n-- -----------------------------------------------------\n');
    } catch (e) {
      console.error(`Failed to show create table for ${table}:`, e.message);
    }
  }
  
  await connection.end();
}

run().catch(console.error);
