import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';
import '../styles/settingsButton.css';

export default function SettingsButton() {
  const navigate = useNavigate();

  return (
    <button 
      className="settings-button"
      onClick={() => navigate('/settings')}
      aria-label="Settings"
    >
      <FaCog className="settings-icon" />
    </button>
  );
}
