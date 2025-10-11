import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import '../styles/game.css';
import placeholder from '../assets/placeholder.png';
import PiMemoryGame from "./PiMemoryGame";
import SettingsButton from '../components/SettingsButton';
import { useAuth } from '../context/AuthContext';

export default function GamePage() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("GamePage rendering...");
  }, []);

  const games = [
    { id: 1, name: "2048", img: placeholder, route: "/2048" },
    { id: 2, name: "Arithmetic Blaster", img: placeholder, route: "/arithmetic-blaster" },
    { id: 3, name: "Fraction Match", img: placeholder, route: "/fraction-match" },
    { id: 4, name: "Geometry Area Challenge", img: placeholder, route: "/geometry-area" },
    { id: 5, name: "Pi Memory Game", img: placeholder, route: "/pi-memory" },
    { id: 6, name: "Prime or Not", img: placeholder, route: "/prime-or-not" },
    { id: 7, name: "Angle Rush", img: placeholder, route: "/angle-rush" },
    { id: 8, name: "Coming Soon", img: placeholder, route: "#" },
  ];

  const { user } = useAuth();

  return (
    <div className="game-page">
      <div className="page-content">
        <header className="game-header">
          <h1>Game Hub</h1>
          <p className="subtitle">Choose a game to play!</p>
        </header>

        <div className="game-container-wrapper">
          <div className="game-container">
            <SettingsButton />
            <div className="game-grid">
              {games.map((game) => (
                <div 
                  key={game.id} 
                  className="game-card"
                  onClick={() => game.route !== "#" && navigate(game.route)}
                >
                  <div className="game-image-container">
                    <img
                      src={game.img}
                      alt={game.name}
                      className="game-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholder;
                      }}
                    />
                  </div>
                  <div className="game-title">{game.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}