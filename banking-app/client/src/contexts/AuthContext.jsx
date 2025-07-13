// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { apiService } from '../services/api';
// import { localDB } from '../services/database';

// const AuthContext = createContext(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const initializeAuth = async () => {
//       try {
//         await localDB.init();
        
//         // Attempt to log in the demo user automatically
//         try {
//           const { user: demoUser } = await apiService.demoLogin();
//           setUser(demoUser);
//         } catch (error) {
//           console.error('Automatic demo login failed:', error);
//           // Fallback to cached user if demo login fails (e.g., server not running)
//           const cachedUser = await localDB.getUserData('user');
//           if (cachedUser) {
//             setUser(cachedUser);
//           } else {
//             // If no cached user and demo login failed, user is truly not authenticated
//             apiService.logout(); 
//           }
//         }
//       } catch (error) {
//         console.error('Auth initialization failed:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     initializeAuth();

//     // Listen for sync events to update user bank accounts/details
//     const handleTransactionsSynced = async () => {
//       if (user) {
//         try {
//           const updatedUser = await apiService.getAccountDetails();
//           setUser(updatedUser);
//         } catch (error) {
//           console.error('Failed to update user after sync:', error);
//         }
//       }
//     };

//     window.addEventListener('transactionsSynced', handleTransactionsSynced);

//     return () => {
//       window.removeEventListener('transactionsSynced', handleTransactionsSynced);
//     };
//   }, [user?.id]); // Re-run if user ID changes (e.g., after login/logout)

//   const logout = () => {
//     apiService.logout();
//     setUser(null);
//   };

//   const updateUserBankAccounts = async () => {
//     if (user) {
//       try {
//         const updatedUser = await apiService.getAccountDetails();
//         setUser(updatedUser);
//       } catch (error) {
//         console.error('Failed to update user bank accounts:', error);
//       }
//     }
//   };

//   const value = {
//     user,
//     logout,
//     isLoading,
//     updateUserBankAccounts,
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
