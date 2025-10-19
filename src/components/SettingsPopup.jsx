import React, { useState, useEffect } from 'react';
import { FaVolumeUp, FaVolumeMute, FaTimes } from 'react-icons/fa';
import '../styles/settings-popup.css';

const SettingsPopup = ({ isOpen, onClose }) => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('isMuted') === 'true';
  });

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('isMuted', newMutedState);
    
    // You can add sound mute/unmute logic here
    // For example: Howler.mute(newMutedState);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-popup-overlay">
      <div className="settings-popup">
        <div className="settings-popup-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="settings-option">
          <div className="settings-option-label">
            <FaVolumeUp className="settings-icon" />
            <span>Sound</span>
          </div>
          <button 
            className={`toggle-btn ${isMuted ? 'muted' : ''}`}
            onClick={handleMuteToggle}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            <div className="toggle-switch">
              <div className="toggle-knob"></div>
            </div>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;
