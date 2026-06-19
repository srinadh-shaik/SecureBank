// 1. Load Environment Variables First
import dotenv from 'dotenv';
dotenv.config();

// ADD THESE 4 LINES:
console.log("--- STARTUP CHECK ---");
console.log("Twilio SID Loaded:", !!process.env.TWILIO_ACCOUNT_SID); 
console.log("Twilio Token Loaded:", !!process.env.TWILIO_AUTH_TOKEN);
console.log("Twilio From Number:", process.env.TWILIO_PHONE_NUMBER);
console.log("---------------------");

import express, { json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sqlite3 from 'sqlite3';

import { v4 as uuidv4 } from 'uuid';
const jwt = await import('jsonwebtoken');
const { verify, sign } = jwt.default;
import bcrypt from 'bcryptjs';

// 2. Import and Initialize Twilio
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// In-memory store for OTPs
const otpStore = new Map();

const app = express();
const PORT = 8000;
// Throw an error if the secret is missing so the server doesn't start insecurely
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;



// Security middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 150 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/', globalLimiter);


// OTP specific rate limiting
const otpLimiter = rateLimit({
  windowMs: 1 * 60 *1, // 1 minute
  max: 3, // 3 attempts per 1 minute
  keyGenerator: (req) => req.body.phoneNumber, // Rate limit by phone number
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many OTP requests for this phone number. Please try again after 100 minutes.' });
  }
});

// Database initialization
const db = new sqlite3.Database('./bank.db');


// Initialize database tables
db.serialize(() => {
 db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT, -- ADD THIS LINE
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      is_primary BOOLEAN DEFAULT 0, -- YOU NEED TO ADD THIS LINE HERE TOO!
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
  
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

// Phone number validation utility
const isValidPhoneNumber = (phoneNumber) => {
  // Basic regex for international phone numbers (E.164 format recommended)
  // This is a simplified regex. For production, use a dedicated library like 'libphonenumber-js'.
  if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    return false;
  }
  // Block known invalid/test ranges (e.g., +999, +123, etc.)
  if (phoneNumber.startsWith('+999') || phoneNumber.startsWith('+123') || phoneNumber.startsWith('+0')) {
    return false;
  }
  return true;
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach user payload (id, phone_number) to request
    next();
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// --- Authentication Endpoints (Phone Number + OTP) ---

app.post('/auth/request-otp', otpLimiter, async (req, res) => {
  const { phoneNumber, name } = req.body;
  
  console.log(`\n[1] OTP Request received for: ${phoneNumber}`);

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); 

  otpStore.set(phoneNumber, { otp, expiry, attempts: 0, lastAttempt: new Date(), pendingName: name });

  console.log(`[2] Generated OTP: ${otp}. Attempting to contact Twilio...`);

  try {
    const message = await twilioClient.messages.create({
      body: `Your SecureBank verification code is: ${otp}. Do not share this.`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    
    console.log(`[3] SUCCESS! Twilio accepted the message.`);
    console.log(`    Message SID: ${message.sid}`);
    console.log(`    Status: ${message.status}`);
    
    res.json({ message: `OTP sent successfully to ${phoneNumber}` });
    
  } catch (error) {
    console.log(`[3]  TWILIO FAILED TO SEND!`);
    console.error(`    HTTP Status:`, error.status);
    console.error(`    Twilio Error Code:`, error.code);
    console.error(`    Message:`, error.message);
    console.error(`    More Info:`, error.moreInfo); // This usually gives a link to fix it
    
    otpStore.delete(phoneNumber);
    res.status(500).json({ error: 'Failed to send OTP via SMS. Check server logs.' });
  }
});

app.post('/auth/verify-otp', otpLimiter, (req, res) => {
  const { phoneNumber, otp } = req.body;
  console.log(`Verifying OTP for ${phoneNumber}: ${otp}`);
  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }
  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number format or range.' });
  }
  
  const storedOtpData = otpStore.get(phoneNumber);

  if (!storedOtpData) {
    return res.status(401).json({ error: 'OTP not requested or expired.' });
  }
  
  // Increment attempt count
  storedOtpData.attempts++;
  storedOtpData.lastAttempt = new Date();
  otpStore.set(phoneNumber, storedOtpData); 
  
  if (storedOtpData.otp !== otp || new Date() > storedOtpData.expiry) {
    if (storedOtpData.attempts >= 3) { 
      otpStore.delete(phoneNumber);
      return res.status(401).json({ error: 'Invalid or expired OTP. Too many attempts, please request a new OTP.' });
    }
    return res.status(401).json({ error: 'Invalid or expired OTP.' });
  }

  // UPDATE: Extract the name before deleting from store
  const pendingName = storedOtpData.pendingName;
  otpStore.delete(phoneNumber);

  // UPDATE: Added 'name' to the SELECT query
  db.get('SELECT id, phone_number, name FROM users WHERE phone_number = ?', [phoneNumber], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    let currentUser = user;
    if (!currentUser) {
      // Register new user
      const userId = uuidv4();
      
      // UPDATE: Added name to INSERT query
      db.run(
        'INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)',
        [userId, phoneNumber, pendingName || null],
        function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Failed to register user' });
          }
          // UPDATE: Added name to the currentUser object
          currentUser = { id: userId, phone_number: phoneNumber, name: pendingName };
          sendAuthResponse(res, currentUser, 'Account created successfully! Please link a bank account.');
        }
      );
    } else {
      // Login existing user
      sendAuthResponse(res, currentUser, 'Login successful');
    }
  });
});


function sendAuthResponse(res, user, message) {
  // UPDATE: Added name to the JWT token payload
  const token = sign(
    { id: user.id, phone_number: user.phone_number, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // UPDATE: Added 'is_primary' to SELECT and ordered by it
  db.all('SELECT id, bank_name, account_number, ifsc_code, branch, balance, is_primary FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC', [user.id], (err, bankAccounts) => {
    if (err) {
      console.error('Error fetching bank accounts for user:', err);
      return res.json({
        token,
        user: {
          id: user.id,
          phone_number: user.phone_number,
          name: user.name, // UPDATE: Included here
          bankAccounts: [],
        },
        message
      });
    }

    res.json({
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        name: user.name, // UPDATE: Included here
        bankAccounts: bankAccounts || [],
      },
      message
    });
  });
}

// --- Protected Account & Bank Account Endpoints ---

// --- Protected Account & Bank Account Endpoints ---

app.get('/account/details', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // UPDATE: Added 'name' to the SELECT query
  db.get('SELECT id, phone_number, name FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // UPDATE: Added 'is_primary' to SELECT and ordered by it
    db.all('SELECT id, bank_name, account_number, ifsc_code, branch, balance, is_primary FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC', [userId], (err, bankAccounts) => {
      if (err) {
        console.error('Error fetching bank accounts for user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({
        id: user.id,
        phone_number: user.phone_number,
        name: user.name, // UPDATE: Included here
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
  const userId = req.user.id;
  db.all('SELECT id, bank_name, account_number, ifsc_code, branch, balance FROM bank_accounts WHERE user_id = ?', [userId], (err, bankAccounts) => {
    if (err) {
      console.error('Error fetching bank accounts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(bankAccounts || []);
  });
});

app.post('/api/bank-accounts/set-primary', authenticateToken, async (req, res) => {
  const { accountId, pin } = req.body;
  const userId = req.user.id; // From your JWT auth middleware

  try {
    // 1. Fetch the specific bank account to verify the PIN
    const account = await db.query(
      'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2', 
      [accountId, userId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // 2. Verify the PIN (Assuming you stored it securely, adjust comparison as needed)
    // If you hashed the PIN, use bcrypt.compare here. 
    if (account.rows[0].pin !== pin) {
      return res.status(401).json({ error: 'Incorrect 4-digit PIN' });
    }

    // 3. Begin Transaction to swap primary status
    await db.query('BEGIN');
    
    // Set all user accounts to NOT primary
    await db.query(
      'UPDATE bank_accounts SET is_primary = false WHERE user_id = $1', 
      [userId]
    );
    
    // Set the selected account TO primary
    await db.query(
      'UPDATE bank_accounts SET is_primary = true WHERE id = $1 AND user_id = $2', 
      [accountId, userId]
    );

    await db.query('COMMIT');
    res.json({ message: 'Primary account updated successfully' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error setting primary account:', error);
    res.status(500).json({ error: 'Server error' });
  }
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
                        clientTimestamp: clientTimestamp || new Date().toISOString(),
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

app.post('/sync/transactions', authenticateToken, (req, res) => {
  const { transactions } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Transactions must be an array' });
  }

  if (transactions.length === 0) {
    return res.json({ results: [] });
  }

  const results = [];
  let shouldRollback = false;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Failed to begin transaction for sync:', err);
        return res.status(500).json({ error: 'Failed to start sync transaction' });
      }

      let i = 0;
      const processNextTransaction = () => {
        if (i < transactions.length) {
          const transaction = transactions[i];
          const currentIndex = i; // Capture current index for results array
          const { id, fromBankAccountId, toAccountNumber, toIfscCode, toBranch, amount, senderPin, type, description, clientTimestamp } = transaction;

          // 1. Verify sender's bank account and PIN
          db.get('SELECT id, user_id, balance, pin_hash FROM bank_accounts WHERE id = ?', [fromBankAccountId], (err, senderAccount) => {
            if (err || !senderAccount || senderAccount.user_id !== userId || !bcrypt.compareSync(senderPin, senderAccount.pin_hash) || senderAccount.balance < amount) {
              const errorMsg = err ? 'Database error' : (!senderAccount ? 'Sender account not found' : (senderAccount.user_id !== userId ? 'Unauthorized sender account' : (!bcrypt.compareSync(senderPin, senderAccount.pin_hash) ? 'Invalid sender PIN' : 'Insufficient funds')));
              results[currentIndex] = { id, status: 'failed', error: errorMsg };
              console.error('Offline transaction sync failed (sender verification):', { transactionId: id, reason: errorMsg, timestamp: new Date().toISOString(), userId });
              shouldRollback = true; // Mark for rollback
              i++;
              processNextTransaction(); // Process next
              return;
            }

            // 2. Look up recipient's bank account
            db.get('SELECT id FROM bank_accounts WHERE account_number = ? AND ifsc_code = ? AND branch = ?',
              [toAccountNumber, toIfscCode, toBranch],
              (err, recipientAccount) => {
                if (err || !recipientAccount) {
                  const errorMsg = err ? 'Database error' : 'Recipient bank account not found';
                  results[currentIndex] = { id, status: 'failed', error: errorMsg };
                  console.error('Offline transaction sync failed (recipient lookup):', { transactionId: id, reason: errorMsg, timestamp: new Date().toISOString(), userId });
                  shouldRollback = true; // Mark for rollback
                  i++;
                  processNextTransaction(); // Process next
                  return;
                }

                const toBankAccountId = recipientAccount.id;

                // Prevent self-transfer
                if (fromBankAccountId === toBankAccountId) {
                  results[currentIndex] = { id, status: 'failed', error: 'Cannot transfer to the same account' };
                  console.error('Offline transaction sync failed (self-transfer):', { transactionId: id, reason: 'Cannot transfer to the same account', timestamp: new Date().toISOString(), userId });
                  shouldRollback = true; // Mark for rollback
                  i++;
                  processNextTransaction(); // Process next
                  return;
                }

                // 3. Update balances
                db.run('UPDATE bank_accounts SET balance = balance - ? WHERE id = ?', [amount, fromBankAccountId], (err) => {
                  if (err) {
                    results[currentIndex] = { id, status: 'failed', error: 'Failed to update sender balance' };
                    console.error('Offline transaction sync failed (update sender balance):', { transactionId: id, reason: 'Failed to update sender balance', timestamp: new Date().toISOString(), userId });
                    shouldRollback = true; // Mark for rollback
                    i++;
                    processNextTransaction(); // Process next
                    return;
                  }

                  console.log(`Sync - Updated sender balance: Account ${fromBankAccountId}, deducted ${amount}`);
                  db.run('UPDATE bank_accounts SET balance = balance + ? WHERE id = ?', [amount, toBankAccountId], (err) => {
                    if (err) {
                      results[currentIndex] = { id, status: 'failed', error: 'Failed to update recipient balance' };
                      console.error('Offline transaction sync failed (update recipient balance):', { transactionId: id, reason: 'Failed to update recipient balance', timestamp: new Date().toISOString(), userId });
                      shouldRollback = true; // Mark for rollback
                      i++;
                      processNextTransaction(); // Process next
                      return;
                    }

                    console.log(`Sync - Updated recipient balance: Account ${toBankAccountId}, added ${amount}`);

                    // 4. Create transaction record or update existing one
                    db.run(
                      `INSERT OR REPLACE INTO transactions 
                       (id, from_bank_account_id, to_bank_account_id, amount, type, description, status, client_timestamp, created_at, synced) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [id, fromBankAccountId, toBankAccountId, amount, type, description || '', 'completed', clientTimestamp || new Date().toISOString(), new Date().toISOString(), 1],
                      (err) => {
                        if (err) {
                          results[currentIndex] = { id, status: 'failed', error: 'Failed to create/update transaction record' };
                          console.error('Offline transaction sync failed (create/update transaction record):', { transactionId: id, reason: 'Failed to create/update transaction record', timestamp: new Date().toISOString(), userId });
                          shouldRollback = true; // Mark for rollback
                        } else {
                          results[currentIndex] = { id, status: 'success' };
                        }
                        i++;
                        processNextTransaction(); // Process next
                      }
                    );
                  });
                });
              }
            );
          });
        } else {
          // All transactions processed, now commit or rollback
          if (shouldRollback) {
            db.run('ROLLBACK', (err) => {
              if (err) console.error('Rollback error:', err);
              res.json({ results });
            });
          } else {
            db.run('COMMIT', (err) => {
              if (err) console.error('Commit error:', err);
              res.json({ results });
            });
          }
        }
      };
      processNextTransaction(); // Start processing
    });
  });
});

app.get('/transactions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // First, get the count of transactions for pagination
  db.get(`
    SELECT COUNT(t.id) AS total
    FROM transactions t
    LEFT JOIN bank_accounts from_acc ON t.from_bank_account_id = from_acc.id
    LEFT JOIN bank_accounts to_acc ON t.to_bank_account_id = to_acc.id
    WHERE
      from_acc.user_id = ? OR to_acc.user_id = ?
  `, [userId, userId], (err, countRow) => {
    if (err) {
      console.error('Error counting transactions:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalTransactions = countRow.total;
    const hasMore = (page * limit) < totalTransactions;

    // Then, fetch the paginated transactions
    db.all(`
      SELECT
          t.id,
          t.from_bank_account_id,
          t.to_bank_account_id,
          t.amount,
          t.type,
          t.description,
          t.status,
          t.created_at,
          t.client_timestamp,
          t.synced,
          from_acc.bank_name AS from_bank_name,
          from_acc.account_number AS from_account_number,
          to_acc.bank_name AS to_bank_name,
          to_acc.account_number AS to_account_number
      FROM
          transactions t
      LEFT JOIN
          bank_accounts from_acc ON t.from_bank_account_id = from_acc.id
      LEFT JOIN
          bank_accounts to_acc ON t.to_bank_account_id = to_acc.id
      WHERE
          from_acc.user_id = ? OR to_acc.user_id = ?
      ORDER BY
          t.created_at DESC
      LIMIT ? OFFSET ?;
    `, [userId, userId, limit, offset], (err, transactions) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ transactions: transactions || [], hasMore });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Gracefully shutting down...');
  
  // Close SQLite database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Gracefully shutting down...');
  
  // Close SQLite database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Banking server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});