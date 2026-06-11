import mysql from 'mysql2/promise';

async function checkDbs() {
  const configs = [
    { host: '127.0.0.1', port: 3306, user: 'ticklora', password: 'ticklora2026' },
    { host: '127.0.0.1', port: 3306, user: 'ticklora', password: '' },
    { host: '127.0.0.1', port: 3306, user: 'connectit_user', password: 'your_password' },
    { host: '127.0.0.1', port: 3306, user: 'connectit_user', password: 'ticklora2026' },
  ];

  for (const config of configs) {
    try {
      console.log(`Trying connection to ${config.host}:${config.port} as ${config.user} with password "${config.password}"...`);
      const connection = await mysql.createConnection(config);
      console.log('CONNECTED successfully!');
      
      const [rows] = await connection.query('SHOW DATABASES');
      console.log('Databases:', (rows as any[]).map(r => r.Database));
      
      await connection.end();
      return;
    } catch (err: any) {
      console.error(`Failed:`, err.message);
    }
  }
}

checkDbs();
