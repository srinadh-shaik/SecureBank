import express, { json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sqlite3 from 'sqlite3';

import { v4 as uuidv4 } from 'uuid';
const jwt = await import('jsonwebtoken');
const { verify, sign } = jwt.default;
import { hashSync, compareSync } from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Security middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/', limiter);

const db = new sqlite3.Database('./bank.db');
// Initialize database tables
db.serialize(() => {
  // Users table: Stores core user info (phone number for OTP auth)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bank_Accounts table: Stores linked bank accounts for users
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      ifsc_code TEXT NOT NULL,
      branch TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Transactions table: Stores all transaction records
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      from_bank_account_id TEXT NOT NULL,
      to_bank_account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      client_timestamp DATETIME,
      synced INTEGER DEFAULT 0, -- 0 for not synced, 1 for synced to main DB
      FOREIGN KEY (from_bank_account_id) REFERENCES bank_accounts (id),
      FOREIGN KEY (to_bank_account_id) REFERENCES bank_accounts (id)
    )
  `);
});

// --- Automatic Demo User Provisioning ---
const DEMO_USER_PHONE = '+919876543210';
let demoUserId = null;

// Initialize demo user on server startup
db.get('SELECT id FROM users WHERE phone_number = ?', [DEMO_USER_PHONE], (err, userRow) => {
  if (err) {
    console.error('Error checking for demo user on startup:', err);
    return;
  }
  if (userRow) {
    demoUserId = userRow.id;
    console.log(`Demo user ${DEMO_USER_PHONE} already exists with ID: ${demoUserId}`);
  } else {
    const newDemoUserId = uuidv4();
    db.run('INSERT INTO users (id, phone_number) VALUES (?, ?)', [newDemoUserId, DEMO_USER_PHONE], (insertErr) => {
      if (insertErr) {
        console.error('Error creating demo user on startup:', insertErr);
      } else {
        demoUserId = newDemoUserId;
        console.log(`Demo user ${DEMO_USER_PHONE} created with ID: ${demoUserId}`);
      }
    });
  }
});

// Authentication middleware (Always authenticates as the demo user)
const authenticateToken = (req, res, next) => {
  if (!demoUserId) {
    // This should ideally not happen if the server startup logic completes successfully
    return res.status(500).json({ error: 'Demo user not initialized on server. Please restart the server.' });
  }
  // For this demo, we bypass JWT validation and directly assign the demo user
  req.user = { id: demoUserId, phone_number: DEMO_USER_PHONE };
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// --- Protected Account & Bank Account Endpoints ---

app.get('/account/details', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT id, phone_number FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.all('SELECT id, bank_name, account_number, ifsc_code, branch, balance FROM bank_accounts WHERE user_id = ?', [userId], (err, bankAccounts) => {
      if (err) {
        console.error('Error fetching bank accounts for user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({
        id: user.id,
        phone_number: user.phone_number,
        bankAccounts: bankAccounts || [],
      });
    });
  });
});

app.post('/bank-accounts/link', authenticateToken, (req, res) => {
  const { bankName, accountNumber, ifscCode, branch, pin } = req.body;
  const userId = req.user.id;

  if (!bankName || !accountNumber || !ifscCode || !branch || !pin) {
    return res.status(400).json({ error: 'All bank account fields and PIN are required' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be a 4-digit number' });
  }

  const pinHash = bcrypt.hashSync(pin, 10); // Hash the 4-digit PIN
  const bankAccountId = uuidv4();
  const initialBalance = 1000.00; // Initial balance for new bank account

  db.run(
    'INSERT INTO bank_accounts (id, user_id, bank_name, account_number, ifsc_code, branch, pin_hash, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [bankAccountId, userId, bankName, accountNumber, ifscCode, branch, pinHash, initialBalance],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: bank_accounts.account_number')) {
          return res.status(409).json({ error: 'Bank account number already linked' });
        }
        console.error('Error linking bank account:', err);
        return res.status(500).json({ error: 'Failed to link bank account' });
      }
      res.status(201).json({
        id: bankAccountId,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        branch: branch,
        balance: initialBalance,
        message: 'Bank account linked successfully with 1000 INR initial balance!'
      });
    }
  );
});

app.get('/bank-accounts', authenticateToken, (req, res) => {
  console.log("inside bank accounts");
  const userId = req.user.id;
  db.all('SELECT id, bank_name, account_number, ifsc_code, branch, balance FROM bank_accounts WHERE user_id = ?', [userId], (err, bankAccounts) => {
    if (err) {
      console.error('Error fetching bank accounts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(bankAccounts || []);
  });
});

app.post('/bank-accounts/lookup', authenticateToken, (req, res) => {
  const { accountNumber, ifscCode, branch } = req.body;

  if (!accountNumber || !ifscCode || !branch) {
    return res.status(400).json({ error: 'Account number, IFSC code, and branch are required for lookup' });
  }

  db.get('SELECT id, bank_name, account_number, ifsc_code, branch FROM bank_accounts WHERE account_number = ? AND ifsc_code = ? AND branch = ?',
    [accountNumber, ifscCode, branch],
    (err, bankAccount) => {
      if (err) {
        console.error('Error looking up bank account:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!bankAccount) {
        return res.status(404).json({ error: 'Recipient bank account not found with provided details' });
      }
      res.json({
        id: bankAccount.id,
        bank_name: bankAccount.bank_name,
        account_number: bankAccount.account_number,
        ifsc_code: bankAccount.ifsc_code,
        branch: bankAccount.branch
      });
    }
  );
});

// --- Protected Transaction Endpoints ---

app.post('/transactions', authenticateToken, (req, res) => {
  const { fromBankAccountId, toAccountNumber, toIfscCode, toBranch, amount, senderPin, type, description, clientTimestamp } = req.body;
  const userId = req.user.id;

  if (!fromBankAccountId || !toAccountNumber || !toIfscCode || !toBranch || !amount || !senderPin || !type) {
    return res.status(400).json({ error: 'Missing required transaction fields' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }
  if (!/^\d{4}$/.test(senderPin)) {
    return res.status(400).json({ error: 'Sender PIN must be a 4-digit number' });
  }

  const transactionId = uuidv4();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Verify sender's bank account and PIN
    db.get('SELECT id, user_id, balance, pin_hash FROM bank_accounts WHERE id = ?', [fromBankAccountId], (err, senderAccount) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Transaction failed: Database error during sender verification', err);
        return res.status(500).json({ error: 'Database error during sender verification' });
      }
      if (!senderAccount || senderAccount.user_id !== userId) {
        db.run('ROLLBACK');
        console.error('Transaction failed: Unauthorized sender account or not found');
        return res.status(403).json({ error: 'Unauthorized sender account' });
      }
      if (!bcrypt.compareSync(senderPin, senderAccount.pin_hash)) {
        db.run('ROLLBACK');
        console.error('Transaction failed: Invalid sender PIN');
        return res.status(401).json({ error: 'Invalid sender PIN' });
      }
      if (senderAccount.balance < amount) {
        db.run('ROLLBACK');
        console.error('Transaction failed: Insufficient funds in sender account');
        return res.status(400).json({ error: 'Insufficient funds in sender account' });
      }

      // 2. Look up recipient's bank account
      db.get('SELECT id FROM bank_accounts WHERE account_number = ? AND ifsc_code = ? AND branch = ?',
        [toAccountNumber, toIfscCode, toBranch],
        (err, recipientAccount) => {
          if (err) {
            db.run('ROLLBACK');
            console.error('Transaction failed: Database error during recipient lookup', err);
            return res.status(500).json({ error: 'Database error during recipient lookup' });
          }
          if (!recipientAccount) {
            db.run('ROLLBACK');
            console.error('Transaction failed: Recipient bank account not found');
            return res.status(404).json({ error: 'Recipient bank account not found with provided details' });
          }

          const toBankAccountId = recipientAccount.id;

          // Prevent self-transfer
          if (fromBankAccountId === toBankAccountId) {
            db.run('ROLLBACK');
            console.error('Transaction failed: Cannot transfer to the same account');
            return res.status(400).json({ error: 'Cannot transfer to the same account' });
          }

          // 3. Update balances
          db.run('UPDATE bank_accounts SET balance = balance - ? WHERE id = ?', [amount, fromBankAccountId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              console.error('Transaction failed: Failed to update sender balance', err);
              return res.status(500).json({ error: 'Failed to update sender balance' });
            }

            db.run('UPDATE bank_accounts SET balance = balance + ? WHERE id = ?', [amount, toBankAccountId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                console.error('Transaction failed: Failed to update recipient balance', err);
                return res.status(500).json({ error: 'Failed to update recipient balance' });
              }

              // 4. Create transaction record
              db.run(
                'INSERT INTO transactions (id, from_bank_account_id, to_bank_account_id, amount, type, description, status, client_timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [transactionId, fromBankAccountId, toBankAccountId, amount, type, description || '', 'completed', clientTimestamp || new Date().toISOString(), 1],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    console.error('Transaction failed: Failed to create transaction record', err);
                    return res.status(500).json({ error: 'Failed to create transaction record' });
                  }

                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      console.error('Transaction commit error:', commitErr);
                      return res.status(500).json({ error: 'Transaction failed during commit' });
                    }
                    res.json({
                      id: transactionId,
                      message: 'Transaction completed successfully',
                      transaction: {
                        id: transactionId,
                        fromBankAccountId,
                        toBankAccountId,
                        amount,
                        type,
                        description: description || '',
                        status: 'completed',
                        createdAt: new Date().toISOString(),
                        synced: 1
                      }
                    });
                  });
                }
              );
            });
          });
        }
      );
    });
  });
});

app.get('/transactions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // First, get all bank account IDs for the current user
  db.all('SELECT id FROM bank_accounts WHERE user_id = ?', [userId], (err, userBankAccounts) => {
    if (err) {
      console.error('Error fetching user bank accounts for transactions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const userBankAccountIds = userBankAccounts.map(acc => acc.id);

    if (userBankAccountIds.length === 0) {
      return res.json({ transactions: [], page, limit, hasMore: false });
    }

    const placeholders = userBankAccountIds.map(() => '?').join(',');
    db.all(
      `SELECT t.*, 
              sba.account_number AS from_account_number, sba.bank_name AS from_bank_name, sba.ifsc_code AS from_ifsc_code, sba.branch AS from_branch,
              rba.account_number AS to_account_number, rba.bank_name AS to_bank_name, rba.ifsc_code AS to_ifsc_code, rba.branch AS to_branch
       FROM transactions t
       JOIN bank_accounts sba ON t.from_bank_account_id = sba.id
       JOIN bank_accounts rba ON t.to_bank_account_id = rba.id
       WHERE t.from_bank_account_id IN (${placeholders}) OR t.to_bank_account_id IN (${placeholders})
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...userBankAccountIds, ...userBankAccountIds, limit, offset],
      (err, transactions) => {
        if (err) {
          console.error('Error fetching transactions:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          transactions: transactions || [],
          page,
          limit,
          hasMore: transactions.length === limit
        });
      }
    );
  });
});

// Sync endpoint for offline transactions
app.post('/sync/transactions', authenticateToken, (req, res) => {
  const { transactions } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Transactions must be an array' });
  }

  const results = [];
  let completed = 0;

  if (transactions.length === 0) {
    return res.json({ results: [] });
  }

  transactions.forEach((transaction, index) => {
    const { id, fromBankAccountId, toAccountNumber, toIfscCode, toBranch, amount, senderPin, type, description, clientTimestamp } = transaction;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 1. Verify sender's bank account and PIN
      db.get('SELECT id, user_id, balance, pin_hash FROM bank_accounts WHERE id = ?', [fromBankAccountId], (err, senderAccount) => {
        if (err || !senderAccount || senderAccount.user_id !== userId || !bcrypt.compareSync(senderPin, senderAccount.pin_hash) || senderAccount.balance < amount) {
          db.run('ROLLBACK');
          const errorMsg = err ? 'Database error' : (!senderAccount ? 'Sender account not found' : (senderAccount.user_id !== userId ? 'Unauthorized sender account' : (!bcrypt.compareSync(senderPin, senderAccount.pin_hash) ? 'Invalid sender PIN' : 'Insufficient funds')));
          results[index] = { id, status: 'failed', error: errorMsg };
          console.error('Offline transaction sync failed (sender verification):', { transactionId: id, reason: errorMsg, timestamp: new Date().toISOString(), userId });
          completed++;
          if (completed === transactions.length) {
            res.json({ results });
          }
          return;
        }

        // 2. Look up recipient's bank account
        db.get('SELECT id FROM bank_accounts WHERE account_number = ? AND ifsc_code = ? AND branch = ?',
          [toAccountNumber, toIfscCode, toBranch],
          (err, recipientAccount) => {
            if (err || !recipientAccount) {
              db.run('ROLLBACK');
              const errorMsg = err ? 'Database error' : 'Recipient bank account not found';
              results[index] = { id, status: 'failed', error: errorMsg };
              console.error('Offline transaction sync failed (recipient lookup):', { transactionId: id, reason: errorMsg, timestamp: new Date().toISOString(), userId });
              completed++;
              if (completed === transactions.length) {
                res.json({ results });
              }
              return;
            }

            const toBankAccountId = recipientAccount.id;

            // Prevent self-transfer
            if (fromBankAccountId === toBankAccountId) {
              db.run('ROLLBACK');
              results[index] = { id, status: 'failed', error: 'Cannot transfer to the same account' };
              console.error('Offline transaction sync failed (self-transfer):', { transactionId: id, reason: 'Cannot transfer to the same account', timestamp: new Date().toISOString(), userId });
              completed++;
              if (completed === transactions.length) {
                res.json({ results });
              }
              return;
            }

            // 3. Update balances
            db.run('UPDATE bank_accounts SET balance = balance - ? WHERE id = ?', [amount, fromBankAccountId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                results[index] = { id, status: 'failed', error: 'Failed to update sender balance' };
                console.error('Offline transaction sync failed (update sender balance):', { transactionId: id, reason: 'Failed to update sender balance', timestamp: new Date().toISOString(), userId });
                completed++;
                if (completed === transactions.length) {
                  res.json({ results });
                }
                return;
              }

              db.run('UPDATE bank_accounts SET balance = balance + ? WHERE id = ?', [amount, toBankAccountId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  results[index] = { id, status: 'failed', error: 'Failed to update recipient balance' };
                  console.error('Offline transaction sync failed (update recipient balance):', { transactionId: id, reason: 'Failed to update recipient balance', timestamp: new Date().toISOString(), userId });
                  completed++;
                  if (completed === transactions.length) {
                    res.json({ results });
                  }
                  return;
                }

                // 4. Create transaction record or update existing one (if it was a pending offline transaction)
                db.run(
                  `INSERT OR REPLACE INTO transactions 
                   (id, from_bank_account_id, to_bank_account_id, amount, type, description, status, client_timestamp, created_at, synced) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [id, fromBankAccountId, toBankAccountId, amount, type, description || '', 'completed', clientTimestamp || new Date().toISOString(), new Date().toISOString(), 1],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      results[index] = { id, status: 'failed', error: 'Failed to create/update transaction record' };
                      console.error('Offline transaction sync failed (create/update transaction record):', { transactionId: id, reason: 'Failed to create/update transaction record', timestamp: new Date().toISOString(), userId });
                    } else {
                      db.run('COMMIT');
                      results[index] = { id, status: 'success' };
                    }
                    completed++;
                    if (completed === transactions.length) {
                      res.json({ results });
                    }
                  }
                );
              });
            });
          }
        );
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Banking server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});