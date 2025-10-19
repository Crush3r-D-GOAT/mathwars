import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaTrophy, FaGamepad, FaUser, FaUserEdit, FaSignOutAlt } from 'react-icons/fa';
import SettingsButton from '../components/SettingsButton';
import SettingsPopup from '../components/SettingsPopup';
import '../styles/profile.css';
import { fetchUserHighestScore, fetchUserGameCount } from '../api/client';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [userHighScore, setUserHighScore] = useState(0);
  const [userGameCount, setUserGameCount] = useState(0);

  // Fetch data after mount
  useEffect(() => {
    if (!user?.userid) return;

    const fetchStats = async () => {
      try {
        const highScore = await fetchUserHighestScore(user.userid);
        const gameCount = await fetchUserGameCount(user.userid);
        setUserHighScore(highScore);
        setUserGameCount(gameCount);
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };

    fetchStats();
  }, [user?.userid]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.username ? (
              <div className="avatar-initials">
                {user.username.charAt(0).toUpperCase()}
              </div>
            ) : (
              <FaUser className="avatar-icon" />
            )}
            <button className="edit-profile-btn">
              <FaUserEdit className="edit-icon" />
            </button>
          </div>
          <h2 className="username">{user?.username || 'User'}</h2>
          <p className="user-email">{user?.email || 'user@example.com'}</p>
          
          <div className="settings-button-container">
            <SettingsButton />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-container">
              <FaTrophy className="stat-icon" />
            </div>
            <div className="stat-details">
              <span className="stat-value">{userHighScore}</span>
              <span className="stat-label">High Score</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-container">
              <FaGamepad className="stat-icon" />
            </div>
            <div className="stat-details">
              <span className="stat-value">{userGameCount}</span>
              <span className="stat-label">Games Played</span>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="action-btn achievements-btn"
            onClick={() => navigate('/achievements')}
          >
            <FaTrophy className="btn-icon" />
            <span>Achievements</span>
          </button>
          <button 
            className="action-btn logout-btn"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="btn-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <SettingsPopup 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default ProfilePage;
