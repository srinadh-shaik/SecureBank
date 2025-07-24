import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { localDB } from '../services/database';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await localDB.init(); // Ensure IndexedDB is initialized first
        
        const token = apiService.getToken();
        if (token) {
          try {
            const userDetails = await apiService.getAccountDetails();
            setUser(userDetails);
          } catch (error) {
            console.error('Failed to fetch user details with existing token:', error);
            // If token is invalid or expired, try to load from cache
            const cachedUser = await localDB.getUserData('user');
            if (cachedUser) {
              setUser(cachedUser);
            } else {
              apiService.logout(); // Clear invalid token and user data
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for sync events to update user bank accounts/details
    const handleTransactionsSynced = async () => {
      if (user) {
        try {
          const updatedUser = await apiService.getAccountDetails();
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to update user after sync:', error);
        }
      }
    };

    window.addEventListener('transactionsSynced', handleTransactionsSynced);

    return () => {
      window.removeEventListener('transactionsSynced', handleTransactionsSynced);
    };
  }, []); // Changed: run only once on mount to avoid repeated calls and 429 errors

  const requestOtp = async (phoneNumber) => {
    try {
      const response = await apiService.requestOtp(phoneNumber);
      return response.message;
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = async (phoneNumber, otp) => {
    try {
      const { user: verifiedUser } = await apiService.verifyOtp(phoneNumber, otp);
      setUser(verifiedUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    
    // Additional cleanup - clear any pending transactions from IndexedDB
    localDB.clearSyncQueue().catch(err => console.error('Failed to clear sync queue on logout:', err));
  };

  const updateUserBankAccounts = async () => {
    if (user) {
      try {
        console.log('AuthContext: Updating user bank accounts...');
        const updatedUser = await apiService.getAccountDetails();
        console.log('AuthContext: Updated user data received:', updatedUser);
        setUser(updatedUser);
        console.log('AuthContext: User state updated with new bank account data');
      } catch (error) {
        console.error('Failed to update user bank accounts:', error);
      }
    }
  };

  const value = {
    user,
    requestOtp,
    verifyOtp,
    logout,
    isLoading,
    updateUserBankAccounts,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
