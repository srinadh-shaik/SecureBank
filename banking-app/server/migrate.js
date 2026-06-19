import sqlite3 from 'sqlite3';

// Connect to your existing database
const db = new sqlite3.Database('./bank.db');

console.log('Starting database migration...');

db.serialize(() => {
  // 1. Add 'name' to the users table
  db.run(`ALTER TABLE users ADD COLUMN name TEXT;`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(' Column "name" already exists in users. Skipping.');
      } else {
        console.error(' Error adding "name" to users:', err.message);
      }
    } else {
      console.log(' Successfully added "name" column to users.');
    }
  });

  // 2. Add 'is_primary' to the bank_accounts table
  db.run(`ALTER TABLE bank_accounts ADD COLUMN is_primary BOOLEAN DEFAULT 0;`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(' Column "is_primary" already exists in bank_accounts. Skipping.');
      } else {
        console.error(' Error adding "is_primary" to bank_accounts:', err.message);
      }
    } else {
      console.log(' Successfully added "is_primary" column to bank_accounts.');
    }
  });
});

// Give it a second to finish the operations, then close the database safely
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error(' Error closing database:', err.message);
    } else {
      console.log('Migration complete. Database closed safely.');
    }
    process.exit(0);
  });
}, 1000);