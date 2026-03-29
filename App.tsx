
import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import { Toaster } from './components/ui/Toast';
import { ScopeProvider } from './context/ScopeContext';

const App: React.FC = () => {
    const { user } = useAuth();

    // The theme application logic has been moved to ThemeContext, DataContext, Login.tsx,
    // and the FOUC-prevention script in index.html for a more robust implementation.

    return (
        <ScopeProvider>
            {user ? <Dashboard /> : <Login />}
            <Toaster />
        </ScopeProvider>
    );
};

export default App;
