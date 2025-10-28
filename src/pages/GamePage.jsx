import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import '../styles/game.css';
import game2048Icon from '../assets/2048_icon.webp';
import gameArithmeticBlasterIcon from '../assets/ArithmeticBlaster_icon.webp';
import gameFractionMatchIcon from '../assets/FractionMatch_icon.webp';
import gameGeometryAreaChallengeIcon from '../assets/GeometryArea_icon.webp';
import gamePiMemoryGameIcon from '../assets/PiMemory_icon.webp';
import gamePrimeOrNotIcon from '../assets/PrimeOrNot_icon.webp';
import gameAngleRushIcon from '../assets/AngleRush_icon.webp';
import gameEquationBlitzIcon from '../assets/EquationBlitz_icon.webp';
import gameFactorFrenzyIcon from '../assets/FactorFrenzy_icon.webp';
import gameSlopeSprintIcon from '../assets/SlopeSprint__icon.webp';
import SettingsButton from '../components/SettingsButton';
import { useAuth } from '../context/AuthContext';
import Swal from "sweetalert2";
import { getDiagnosticStatus } from "../api/client";

export default function GamePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const games = [
    { id: 1, name: "2048", img: game2048Icon, route: "/2048" },
    { id: 2, name: "Arithmetic Blaster", img: gameArithmeticBlasterIcon, route: "/arithmetic-blaster" },
    { id: 3, name: "Fraction Match", img: gameFractionMatchIcon, route: "/fraction-match" },
    { id: 4, name: "Geometry Area Challenge", img: gameGeometryAreaChallengeIcon, route: "/geometry-area" },
    { id: 5, name: "Pi Memory Game", img: gamePiMemoryGameIcon, route: "/pi-memory" },
    { id: 6, name: "Prime or Not", img: gamePrimeOrNotIcon, route: "/prime-or-not" },
    { id: 7, name: "Angle Rush", img: gameAngleRushIcon, route: "/angle-rush" },
    { id: 8, name: "Equation Blitz", img: gameEquationBlitzIcon, route: "/equation-blitz" },
    { id: 9, name: "Factor Frenzy", img: gameFactorFrenzyIcon, route: "/factor-frenzy" },
    { id: 10, name: "Slope Sprint", img: gameSlopeSprintIcon, route: "/slope-sprint" },
  ];

  useEffect(() => {
    if (!user?.userid) return;

    const checkDiagnostic = async () => {
      try {
        const status = await getDiagnosticStatus(user.userid);
        console.log("Diagnostic status:", status);

        if (!status) {
          const result = await Swal.fire({
            title: "Diagnostic Test",
            text: "Do you want to take the diagnostic test?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
          });

          if (result.isConfirmed) {
            Swal.fire({
              title: "Diagnostic Enabled",
              text: "You may now take the diagnostic test!",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
            });
            navigate("/diagnostic");
          }
        }
      } catch (error) {
        console.error("Error handling diagnostic alert:", error);
      }
    };

    checkDiagnostic();
  }, [user, navigate]); // ✅ Run only when user changes

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
