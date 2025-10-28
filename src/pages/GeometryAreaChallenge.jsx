import React, { useState, useEffect, useRef } from "react";
import "../styles/GeometryAreaChallenge.css";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";

export default function GeometryAreaChallenge() {
  const { user } = useAuth();

  const [shape, setShape] = useState(null);
  const [dimensions, setDimensions] = useState({});
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(15);
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [gameSaved, setGameSaved] = useState(false);
  const [areasEntered, setAreasEntered] = useState(0);
  const maxStreakRef = useRef(0);

  const intervalRef = useRef(null);
  const handlingRef = useRef(false);
  const nextTimeoutRef = useRef(null);

  const shapes = ["rectangle", "triangle", "rhombus", "trapezoid"];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          const savedHighScore = await fetchHighScore(user.userid, 4);
          setHighScore(parseInt(savedHighScore) || 0);
        } catch (err) {
          console.error("Failed to load high score", err);
        }
      }
    };
    loadHighScore();
  }, [user?.userid]);

  const generateShape = () => {
    const newShape = shapes[Math.floor(Math.random() * shapes.length)];
    let dims = {};

    switch (newShape) {
      case "rectangle": dims = { width: rand(3, 15), height: rand(3, 15) }; break;
      case "triangle": dims = { base: rand(3, 15), height: rand(3, 15) }; break;
      case "rhombus": dims = { d1: rand(4, 14), d2: rand(4, 14) }; break;
      case "trapezoid": dims = { base1: rand(3, 12), base2: rand(3, 12), height: rand(3, 10) }; break;
      default: break;
    }

    setShape(newShape);
    setDimensions(dims);
    setAnswer("");
    setFeedback("");
    setTime(Math.max(15 - level, 3));
  };

  const calculateArea = () => {
    const { width, height, base, base1, base2, d1, d2 } = dimensions;
    switch (shape) {
      case "rectangle": return width * height;
      case "triangle": return 0.5 * base * height;
      case "rhombus": return 0.5 * d1 * d2;
      case "trapezoid": return 0.5 * (base1 + base2) * height;
      default: return 0;
    }
  };

  const loseLife = (isTimeout = false) => {
    if (handlingRef.current) return;
    handlingRef.current = true;

    setLives((l) => {
      const newLives = l - 1;
      setStreak(0);

      if (isTimeout) setLevel(1);

      if (newLives <= 0) {
        setGameOver(true);
        setFeedback("💀 Game Over");
        handlingRef.current = false;
        saveGame(); // ✅ Save once here
        return 0;
      }

      setFeedback(isTimeout ? "⏳ Time’s up!" : "❌ Wrong!");

      nextTimeoutRef.current = setTimeout(() => {
        generateShape();
        handlingRef.current = false;
      }, 700);

      return newLives;
    });
  };

  const submitAnswer = (e) => {
    e.preventDefault();
    if (gameOver) return;

    const correctArea = calculateArea();
    const diff = Math.abs(parseFloat(answer) - correctArea);

    if (!answer || isNaN(answer)) {
      setFeedback("❌ Enter a number!");
      return;
    }

    if (diff <= 0.5) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      maxStreakRef.current = Math.max(maxStreakRef.current, newStreak);
      
      if (shape === 'trapezoid' || shape === 'rhombus') {
        setAreasEntered(prev => prev + 1);
      }

      const pointsEarned = newStreak * Math.pow(2, level - 1);

      setScore((s) => {
        const newScore = s + pointsEarned;
        if (newScore > highScore) setHighScore(newScore); 
        return newScore;
      });

      setFeedback(` +${pointsEarned} points! (Streak: ${newStreak})`);

      if (newStreak % 5 === 0) setLevel((lvl) => lvl + 1);

      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = setTimeout(() => generateShape(), 300);
    } else {
      setFeedback(` Wrong! (Answer: ${correctArea.toFixed(2)})`);
      setStreak(0);
      loseLife();
    }
  };

  const saveGame = async () => {
    if (!user || gameSaved) return;
    
    const metrics = {
      score,
      streak: maxStreakRef.current,
      scoreOver1000: score > 1000,
      streakOver10: maxStreakRef.current >= 10,
      areas_entered: areasEntered,
      areas_over_5: areasEntered >= 5
    };
    console.log('Game metrics:', metrics);
    
    try {
      const gameData = {
        userid: user.userid,
        gameid: 4,
        score,
        highscore: highScore,
        dateplayed: new Date().toISOString(),
      };
      await saveGameData(gameData);
      setGameSaved(true);
      console.log("GeometryAreaChallenge data saved:", gameData);
    } catch (err) {
      console.error("Failed to save GeometryAreaChallenge", err);
    }
  };

  useEffect(() => {
    if (!gameOver) generateShape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gameOver) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          loseLife(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shape, level, gameOver]);

  const restartGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    handlingRef.current = false;

    setScore(0);
    setHighScore(highScore); // keep current high score
    setLives(3);
    setLevel(1);
    setStreak(0);
    setGameOver(false);
    setGameSaved(false);
    generateShape();
  };

  const renderShape = () => {
    switch (shape) {
      case "rectangle":
        return <div className="shape rectangle" style={{ width: `${dimensions.width * 15}px`, height: `${dimensions.height * 15}px` }}></div>;
      case "triangle":
        return <div className="shape triangle" style={{
          borderBottom: `${dimensions.height * 15}px solid #ff8a00`,
          borderLeft: `${dimensions.base * 7.5}px solid transparent`,
          borderRight: `${dimensions.base * 7.5}px solid transparent`,
        }}></div>;
      case "rhombus":
        return (
          <div className="shape rhombus-wrapper">
            <svg width={dimensions.d1 * 10} height={dimensions.d2 * 10} viewBox={`0 0 ${dimensions.d1 * 10} ${dimensions.d2 * 10}`}>
              <polygon points={`${dimensions.d1*5},0 ${dimensions.d1*10},${dimensions.d2*5} ${dimensions.d1*5},${dimensions.d2*10} 0,${dimensions.d2*5}`} fill="#4ade80" stroke="#25633d" strokeWidth="2"/>
              <line x1="0" y1={dimensions.d2*5} x2={dimensions.d1*10} y2={dimensions.d2*5} stroke="rgba(0,0,0,0.25)" strokeWidth="2"/>
              <line x1={dimensions.d1*5} y1="0" x2={dimensions.d1*5} y2={dimensions.d2*10} stroke="rgba(0,0,0,0.25)" strokeWidth="2"/>
            </svg>
          </div>
        );
      case "trapezoid":
        return <div className="shape trapezoid" style={{
          borderBottom: `${dimensions.height * 15}px solid #00d0ff`,
          borderLeft: `${(dimensions.base1 - dimensions.base2) * 7.5}px solid transparent`,
          borderRight: `${(dimensions.base1 - dimensions.base2) * 7.5}px solid transparent`,
          width: `${dimensions.base2 * 15}px`,
        }}></div>;
      default:
        return null;
    }
  };

  return (
    <div className="geo-container">
      <h1 className="geo-title">📏 Geometry Area Challenge</h1>

      {gameOver ? (
        <div className="geo-gameover">
          <h2>Game Over 💀</h2>
          <p>Final Score: {score}</p>
          <p>High Score: {highScore}</p>
          <div className="geo-gameover-buttons">
            <button className="geo-btn" onClick={restartGame}>Restart</button>
            <button className="geo-btn geo-btn-secondary" onClick={() => window.location.href = '/'}>Back to Main Menu</button>
          </div>
        </div>
      ) : (
        <>
          <div className="geo-arena">{renderShape()}
            <div className="geo-info">
              <p>⏱ Time: {time}s</p>
              <p>❤️ Lives: {lives}</p>
              <p>⭐ Score: {score}</p>
              <p>🏆 High Score: {highScore}</p>
              <p>⚡ Level: {level}</p>
            </div>
          </div>

          <div className="geo-dims">
            {Object.entries(dimensions).map(([k, v]) => (
              <p key={k}>{k}: <strong>{v}</strong> units</p>
            ))}
          </div>

          <form className="geo-form" onSubmit={submitAnswer}>
            <input type="number" step="0.1" placeholder="Enter area" className="geo-input" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <button className="geo-btn" type="submit">Submit</button>
          </form>

          <p className={`geo-feedback ${feedback.includes("✅") ? "correct" : feedback.includes("❌") ? "wrong" : ""}`}>{feedback}</p>
        </>
      )}
    </div>
  );
}
