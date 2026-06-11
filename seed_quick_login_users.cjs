const mysql = require('mysql2/promise');

const usersToSeed = [
  {
    uid: 'demo_t342dq',
    email: 'arun@technosprint.net',
    name: 'Arun (Ultra Admin)',
    role: 'ultra_super_admin',
    password_hash: 'h_ps1kdz_9'
  },
  {
    uid: 'demo_voust',
    email: 'ulter@technosprint.net',
    name: 'Demo Super Admin',
    role: 'super_admin',
    password_hash: 'h_c2sm7e_12'
  },
  {
    uid: 'demo_admin',
    email: 'admin@technosprint.net',
    name: 'Demo Admin',
    role: 'admin',
    password_hash: 'h_c2sm7e_12'
  },
  {
    uid: 'demo_agent',
    email: 'agent@technosprint.net',
    name: 'Demo Support Agent',
    role: 'agent',
    password_hash: 'h_c2sm7e_12'
  },
  {
    uid: 'demo_user',
    email: 'user@technosprint.net',
    name: 'Demo User',
    role: 'user',
    password_hash: 'h_c2sm7e_12'
  }
];

async function run() {
  console.log('Connecting to MySQL on port 3307...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'connectit_db'
  });

  console.log('Seeding quick login users...');
  for (const user of usersToSeed) {
    await connection.execute(`
      INSERT INTO users (uid, email, name, role, password_hash, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        role = VALUES(role),
        password_hash = VALUES(password_hash),
        is_active = 1
    `, [user.uid, user.email, user.name, user.role, user.password_hash]);
    console.log(`Seeded/updated user: ${user.email}`);
  }

  await connection.end();
  console.log('Done seeding!');
}

run().catch(console.error);
