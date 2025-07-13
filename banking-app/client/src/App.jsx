import React from 'react';
import { NetworkProvider } from './contexts/NetworkContext';
import Dashboard from './components/Dashboard';

const App = () => {
  return (
    <NetworkProvider>
      <Dashboard />
    </NetworkProvider>
  );
};

export default App;
