import React, { useState, useEffect, useRef } from "react";
import "../styles/AngleRush.css";

export default function AngleRush() {
  const [angle, setAngle] = useState(0);
  const [type, setType] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(6);
  const [gameOver, setGameOver] = useState(false);
  const [shake, setShake] = useState(false);
  const timerRef = useRef(null);
  const timeOverRef = useRef(false); // ✅ fixes React Strict Mode double-trigger

  const types = ["acute", "right", "obtuse", "straight", "reflex"];

  const classifyAngle = (deg) => {
    if (deg < 90) return "acute";
    if (deg === 90) return "right";
    if (deg > 90 && deg < 180) return "obtuse";
    if (deg === 180) return "straight";
    return "reflex";
  };

  const newAngle = () => {
    const a = Math.ceil(Math.random() * 350) + 1;
    setAngle(a);
    setType(classifyAngle(a));
    setFeedback("");
    setTimeLeft(6);
    timeOverRef.current = false;
  };

  useEffect(() => {
    newAngle();
  }, []);

  // ⏱ timer
  useEffect(() => {
    if (gameOver) return;
    timeOverRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1 && !timeOverRef.current) {
          timeOverRef.current = true;
          handleChoice(null, true);
          return 6;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [angle, gameOver]);

  const handleChoice = (choice, timeout = false) => {
    if (timeout) {
      setFeedback("⏰ Time’s up!");
      loseLife();
      return;
    }

    if (choice === type) {
      setFeedback("✅ Correct!");
      setScore((s) => s + 5 + streak);
      setStreak((st) => st + 1);
      setTimeout(newAngle, 700);
    } else {
      setFeedback(`❌ Incorrect! It was ${type} (${angle}°)`);
      loseLife();
    }
  };

  const loseLife = () => {
    setStreak(0);
    setShake(true);
    
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) {
        clearInterval(timerRef.current);
        setGameOver(true);
      } else {
        setTimeout(() => {
          setShake(false);
          newAngle();
        }, 800);
      }
      return newLives;
    });
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setStreak(0);
    setGameOver(false);
    setShake(false);
    newAngle();
  };

  if (gameOver) {
    return (
      <div className="angle-game-over">
        <h1>💀 Game Over!</h1>
        <p>Final Score: {score}</p>
        <button className="btn angle-play-again" onClick={resetGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className={`angle-container ${shake ? 'lose-life' : ''}`}>
      <header className="angle-header">
        <h1>🧭 Angle Rush</h1>
        <div className="angle-stats">
          <span>⭐ {score}</span>
          <span>🔥 {streak}</span>
          <span>❤️ {lives}</span>
          <span>⏱ {timeLeft}s</span>
        </div>
      </header>

      <main className="angle-main">
        <div className="angle-display">
          <div className="angle-ray base" style={{ transform: `rotate(${0}deg)` }}></div>
          <div className="angle-ray rotated" style={{ transform: `rotate(${360-angle}deg)` }}></div>
          <div className="angle-center">•</div>
        </div>
        <p className="angle-text">{angle}°</p>

        <div className="angle-buttons">
          {types.map((t) => (
            <button
              key={t}
              className="btn angle-btn"
              onClick={() => handleChoice(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className={`angle-feedback ${feedback.startsWith("✅") ? "good" : "bad"}`}>
          {feedback}
        </div>
      </main>
    </div>
  );
}
