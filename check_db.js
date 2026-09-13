const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'dyslexia_db',
    });

    const [tables] = await conn.query('SHOW TABLES');
    console.log('TABLES', JSON.stringify(tables, null, 2));

    try {
      const [rows] = await conn.query('SELECT * FROM scores LIMIT 1');
      console.log('GAME_SCORES', JSON.stringify(rows, null, 2));
    } catch (error) {
      console.error('GAME_SCORES ERR', error.message);
    }

    try {
      const [rows] = await conn.query('SELECT * FROM progress LIMIT 1');
      console.log('PROGRESS', JSON.stringify(rows, null, 2));
    } catch (error) {
      console.error('PROGRESS ERR', error.message);
    }

    await conn.end();
  } catch (error) {
    console.error('CONN_ERR', error.message);
    process.exit(1);
  }
})();
