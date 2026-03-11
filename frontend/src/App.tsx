import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Dashboard from './Dashboard';
import PortfolioDetail from './pages/PortfolioDetail';
import Settings from './pages/Settings';

export const App: React.FC = () => {
  const { accessToken } = useAuthStore();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {accessToken && <Route path="/portfolio/:id" element={<PortfolioDetail />} />}
        {accessToken && <Route path="/settings" element={<Settings />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
