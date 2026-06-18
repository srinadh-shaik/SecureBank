import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthForm';

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('landing'); 

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 1. Authenticated User -> Dashboard
  if (user) return <Dashboard />;

  // 2. User clicked Login or Register -> Separate Auth Page
  if (currentView === 'login' || currentView === 'signup') {
    return (
      <AuthPage 
        initialView={currentView} 
        onBack={() => setCurrentView('landing')} 
      />
    );
  }

  // 3. Default -> Minimalist Landing Page
  return (
    <LandingPage onNavigate={(destination) => setCurrentView(destination)} />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </AuthProvider>
  );
}