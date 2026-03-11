const mysql = require('mysql2/promise');

async function migrateUserFields() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'invbot',
    });

    console.log('Connected to MySQL');

    const queries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) DEFAULT NULL;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT NULL;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;',
    ];

    for (const query of queries) {
      try {
        await connection.execute(query);
        console.log(`✓ Executed: ${query.substring(0, 50)}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`ℹ Column already exists: ${query.substring(0, 50)}...`);
        } else {
          console.error(`✗ Error: ${err.message}`);
        }
      }
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateUserFields();
