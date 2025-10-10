import React from 'react';
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from "./components/BottomNav";

// Import pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/Signup';
import GamePage from './pages/GamePage';
import DiagnosticPage from './pages/DiagnosticPage';
import SettingsPage from './pages/SettingsPage';
// Games
import Game2048 from './pages/Game2048';
import ArithmeticBlaster from './pages/ArithmeticBlaster';
import FractionMatch from './pages/FractionMatch';
import GeometryAreaChallenge from './pages/GeometryAreaChallenge';
import PiMemoryGame from './pages/PiMemoryGame';
import PrimeOrNot from './pages/PrimeOrNot';

// Global CSS
import './App.css';

// Debug component to check if BottomNav is in the DOM
const DebugOverlay = () => {
  const [showDebug, setShowDebug] = React.useState(true);
  const location = useLocation();
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 99999,
      fontSize: '12px',
      maxWidth: '200px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>Debug Info</strong>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          style={{
            background: 'none',
            border: '1px solid white',
            color: 'white',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          {showDebug ? 'Hide' : 'Show'}
        </button>
      </div>
      {showDebug && (
        <div>
          <div>BottomNav should be visible at the bottom</div>
          <div>Check browser's Elements panel for .bottom-nav</div>
          <div>Current path: {location.pathname}</div>
        </div>
      )}
    </div>
  );
};

// Custom hook to check if BottomNav should be shown
const useShowBottomNav = () => {
  const location = useLocation();
  const routesWithNav = ['/game', '/challenges', '/profile', '/stats', '/settings'];
  return routesWithNav.includes(location.pathname);
};
// Main App Content Component
const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showBottomNav = useShowBottomNav();

  return (
    <div className="app" style={{ 
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      position: 'relative',
      paddingBottom: showBottomNav ? '80px' : '0'
    }}>
      <DebugOverlay />
      <Routes>
        {/* Root route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public routes */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/game" replace />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/game" replace />} />
        
        {/* Protected routes */}
        <Route path="/game" element={user ? <GamePage /> : <Navigate to="/login" state={{ from: '/game' }} replace />} />
        <Route path="/challenges" element={user ? <div className="page">Challenges Page</div> : <Navigate to="/login" state={{ from: '/challenges' }} replace />} />
        <Route path="/profile" element={user ? <div className="page">Profile Page</div> : <Navigate to="/login" state={{ from: '/profile' }} replace />} />
        <Route path="/stats" element={user ? <div className="page">Stats Page</div> : <Navigate to="/login" state={{ from: '/stats' }} replace />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" state={{ from: '/settings' }} replace />} />
        <Route path="/diagnostic" element={user ? <DiagnosticPage /> : <Navigate to="/login" state={{ from: '/diagnostic' }} replace />} />
        <Route path="/2048" element={user ? <Game2048 /> : <Navigate to="/login" state={{ from: '/2048' }} replace />} />
        <Route path="/arithmetic-blaster" element={user ? <ArithmeticBlaster /> : <Navigate to="/login" state={{ from: '/arithmetic-blaster' }} replace />} />
        <Route path="/fraction-match" element={user ? <FractionMatch /> : <Navigate to="/login" state={{ from: '/fraction-match' }} replace />} />
        <Route path="/geometry-area" element={user ? <GeometryAreaChallenge /> : <Navigate to="/login" state={{ from: '/geometry-area' }} replace />} />
        <Route path="/pi-memory" element={user ? <PiMemoryGame /> : <Navigate to="/login" state={{ from: '/pi-memory' }} replace />} />
        <Route path="/prime-or-not" element={user ? <PrimeOrNot /> : <Navigate to="/login" state={{ from: '/prime-or-not' }} replace />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? "/game" : "/login"} replace />} />
      </Routes>
      
      {/* Show bottom nav only for authenticated users on certain routes */}
      {user && showBottomNav && <BottomNav />}
    </div>
  );
};

// Main App Component with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
