import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import { FaTrophy, FaUser, FaCog, FaChartLine, FaGamepad } from 'react-icons/fa';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { name: "Games", icon: FaGamepad, route: "/game" },
    { name: "Challenges", icon: FaTrophy, route: "/challenges" },
    { name: "Profile", icon: FaUser, route: "/profile" },
    { name: "Stats", icon: FaChartLine, route: "/stats" },
  ];

  const isActive = (route) => location.pathname.startsWith(route);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      width: '100%',
      maxWidth: 'calc(100% - 40px)'
    }}>
      <div style={{
        background: 'rgba(30, 30, 30, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: '35px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        gap: '15px',
        minWidth: '300px',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
      {navItems.map((item) => {
        const active = isActive(item.route);
        return (
          <div 
            key={item.name}
            onClick={() => navigate(item.route)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              color: active ? '#ff2d2d' : '#a0a0a0',
              padding: '8px 12px',
              borderRadius: '20px',
              transition: 'all 0.3s ease',
              position: 'relative',
              backgroundColor: active ? 'rgba(255, 45, 45, 0.1)' : 'transparent'
            }}
          >
            <div style={{ fontSize: '20px', color: active ? '#ff2d2d' : '#a0a0a0' }}>
              {React.createElement(item.icon, { color: active ? '#ff2d2d' : '#a0a0a0' })}
            </div>
            <div style={{ 
              fontSize: '10px', 
              marginTop: '4px',
              fontWeight: active ? 'bold' : 'normal',
              color: active ? '#ffffff' : '#a0a0a0'
            }}>
              {item.name}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
