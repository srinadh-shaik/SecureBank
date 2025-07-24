import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SecureBank...</p>
        </div>
      </div>
    );
  }

  // Render Dashboard if user is authenticated, otherwise AuthForm
  return user ? <Dashboard /> : <AuthForm />;
};

const App = () => {
  return (
    <AuthProvider>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </AuthProvider>
  );
};

export default App;
