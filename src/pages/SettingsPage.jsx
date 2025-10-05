import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Debug: Log user data on mount and when it changes
  React.useEffect(() => {
    console.log('Current user data in SettingsPage:', user);
    if (user) {
      console.log('Available user fields:', Object.keys(user));
      console.log('User ID value:', user.userid);
    }
  }, [user]);

  return (
    <div className="page">
      <h1>Settings</h1>
      <div style={{ margin: '20px 0' }}>
        <h3>Account Information</h3>
        {user ? (
          <div>
            <p><strong>Username:</strong> {user.username || 'N/A'}</p>
            <p><strong>Email:</strong> {user.email || 'N/A'}</p>
            <p><strong>User ID:</strong> {user.userid || 'N/A'}</p>
          </div>
        ) : (
          <p>No user data available. Please log in.</p>
        )}
        
        {/* Debug information */}
        {process.env.NODE_ENV === 'development' && user && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h4>Debug Information:</h4>
            <pre style={{ fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ margin: '40px 0' }}>
        <h3>Account Actions</h3>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px',
            fontSize: '16px'
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
