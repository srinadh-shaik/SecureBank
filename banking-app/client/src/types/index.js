import { z } from 'zod';

//  User Schema
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  accountNumber: z.string(),
  balance: z.number(),
  fullName: z.string().optional(),
});

//  Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  fromAccount: z.string(),
  toAccount: z.string(),
  amount: z.number(),
  type: z.enum(['transfer', 'payment', 'deposit', 'withdrawal']),
  description: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'syncing']),
  createdAt: z.string(),
  clientTimestamp: z.string().optional(),
  isOffline: z.boolean().optional(),
});

//  NetworkStatus Schema
export const NetworkStatusSchema = z.object({
  isOnline: z.boolean(),
  lastSync: z.string().nullable(),
  syncInProgress: z.boolean(),
});

//  SyncResult Schema
export const SyncResultSchema = z.object({
  id: z.string(),
  status: z.enum(['success', 'failed']),
  error: z.string().optional(),
});

//  Generic API Response Schema
export const ApiResponseSchema = z.object({
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// TransactionForm Input Schema
export const TransactionFormSchema = z.object({
  toAccount: z.string(),
  amount: z.number(),
  type: z.enum(['transfer', 'payment', 'deposit', 'withdrawal']),
  description: z.string().optional(),
});
