import mysql from 'mysql2/promise';

async function checkDbs() {
  const passwords = [
    'admin1234',
    'Password@123',
    'kiru2026',
    'Kiru2026',
    'kiru@2026',
    'Kiru@2026',
    'Kiru_2026',
    'kiru_2026',
    'HP@2026',
    'hp@2026',
    'connectit2026',
    'Connectit2026',
    'Connectit@2026',
    'connectit@2026'
  ];

  for (const pw of passwords) {
    try {
      console.log(`Trying root with password "${pw}"...`);
      const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: pw
      });
      console.log(`SUCCESS! Root password is "${pw}"`);
      const [rows] = await connection.query('SHOW DATABASES');
      console.log('Databases:', (rows as any[]).map(r => r.Database));
      await connection.end();
      return;
    } catch (err: any) {
      console.error('Failed:', err.message);
    }
  }
}

checkDbs();
