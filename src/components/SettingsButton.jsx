import React, { useState } from 'react';
import { FaCog } from 'react-icons/fa';
import SettingsPopup from './SettingsPopup';
import '../styles/settingsButton.css';

export default function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button 
        className="game-settings-button"
        onClick={() => setShowSettings(true)}
        aria-label="Settings"
      >
        <FaCog className="settings-icon" />
      </button>
      <SettingsPopup 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
