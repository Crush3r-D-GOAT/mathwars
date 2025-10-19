import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAllScores, fetchUserGameScores } from "../api/client";
import LineGraph from "../components/LineGraph";

const gameOptions = [
  { id: 0, name: "All Games" }, // 👈 default option
  { id: 1, name: "2048" },
  { id: 3, name: "Fraction Match" },
  { id: 4, name: "Geometry Area Challenge" },
  { id: 5, name: "Pi Memory Game" },
  { id: 6, name: "Prime or Not" },
  { id: 7, name: "Angle Rush" },
  { id: 8, name: "Equation Blitz" },
  { id: 9, name: "Factor Frenzy" },
  { id: 10, name: "Slope Sprint" },
];

const StatsPage = () => {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState(0); // 👈 default to All Games
  const [gameScores, setGameScores] = useState([]);

  useEffect(() => {
    async function loadScores() {
      if (!user?.userid) return;

      try {
        let scores;
        if (selectedGame === 0) {
          // Fetch all game scores combined
          scores = await fetchAllScores(user.userid);
        } else {
          // Fetch scores for a specific game
          scores = await fetchUserGameScores(user.userid, selectedGame);
        }
        setGameScores(scores);
      } catch (err) {
        console.error("Error loading scores:", err);
      }
    }

    loadScores();
  }, [user, selectedGame]);

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1>Your Statistics</h1>

      {/* Game Selector */}
      <div style={{ margin: "1rem 0" }}>
        <label style={{ color: "white", marginRight: "10px" }}>
          Select Game:
        </label>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(Number(e.target.value))}
          style={{
            padding: "0.5rem",
            borderRadius: "8px",
            backgroundColor: "#2b2b2b",
            color: "white",
            border: "1px solid #555",
          }}
        >
          {gameOptions.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </div>

      {/* Graph Section */}
      <div
        style={{
          background: "#1e1e1e",
          borderRadius: "12px",
          padding: "1.5rem",
          marginTop: "1rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "white" }}>
          {gameOptions.find((g) => g.id === selectedGame)?.name} — Score Progress
        </h3>
        {gameScores.length > 0 ? (
          <LineGraph yValues={gameScores} />
        ) : (
          <p style={{ color: "#ccc" }}>No scores yet for this game.</p>
        )}
      </div>
    </div>
  );
};

export default StatsPage;
