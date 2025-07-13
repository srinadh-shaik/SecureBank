
// db.serialize(()=>{
//     db.run(
//       ` CREATE TABLE IF NOT EXISTS users (
//         id TEXT PRIMARY KEY,
//         username TEXT UNIQUE NOT NULL,
//         email TEXT UNIQUE NOT NULL,
//         account_number TEXT UNIQUE NOT NULL,
//         balance REAL DEFAULT 0,
//         full_name TEXT,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//       )`
//     );
  
//     db.run(
//       `CREATE TABLE IF NOT EXISTS transactions (
//         id TEXT PRIMARY KEY,
//         from_account TEXT,
//         to_account TEXT,
//         amount REAL NOT NULL,
//         type TEXT NOT NULL,
//         description TEXT,
//         status TEXT DEFAULT 'completed',
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         client_timestamp DATETIME,
//         FOREIGN KEY (from_account) REFERENCES users (account_number),
//         FOREIGN KEY (to_account) REFERENCES users (account_number)
//       )`
//     );
  
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

// export default db;