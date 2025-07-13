// import sqlite3 from 'sqlite3';
// const db = new sqlite3.Database('./db/database.sqlite', (err) => {
//   if (err) console.error('Database connection error:', err);
//   else console.log('Connected to SQLite database');
// });

// export const initializeDatabase = () => {
//   db.serialize(() => {
//     db.run(`
//       CREATE TABLE IF NOT EXISTS users (
//         id TEXT PRIMARY KEY,
//         name TEXT NOT NULL,
//         email TEXT NOT NULL UNIQUE,
//         accountNumber TEXT NOT NULL UNIQUE,
//         balance REAL DEFAULT 0
//       )
//     `);

//     db.run(`
//       CREATE TABLE IF NOT EXISTS transactions (
//         id TEXT PRIMARY KEY,
//         userId TEXT NOT NULL,
//         type TEXT CHECK(type IN ('deposit', 'withdrawal')) NOT NULL,
//         amount REAL NOT NULL,
//         date TEXT DEFAULT CURRENT_TIMESTAMP,
//         status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
//         FOREIGN KEY(userId) REFERENCES users(id)
//       )
//     `);
    
//     //create demo users
//     db.run(
//       `INSERT OR IGNORE INTO users (id, username, email, account_number, balance,
//       full_name) VALUES (?, ?, ?, ?, ?, ?)`,
//       [uuidv4(), 'rudra', 'rudra@gmail.com', '1234567890', 1000, 'Rudra']
//     );
  
//     db.run(
//       `INSERT OR IGNORE INTO users (id, username, email, account_number, balance,
//       full_name) VALUES (?, ?, ?, ?, ?, ?)`,
//       [uuidv4(), 'srinadh', 'srinadh@gmail.com', '0987654321', 2000, 'Srinadh']
//     );
//   });
// }
// export default db;
