// src/components/GeometryAreaChallenge.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/GeometryAreaChallenge.css";

export default function GeometryAreaChallenge() {
  const [shape, setShape] = useState(null);
  const [dimensions, setDimensions] = useState({});
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(15);
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [lastLives, setLastLives] = useState(3); // to detect 2-life loss event


  // Interval + guards
  const intervalRef = useRef(null);
  const handlingRef = useRef(false);   // prevents concurrent handling of a life-loss event
  const nextTimeoutRef = useRef(null); // used to delay next shape so player can see feedback

  const shapes = ["rectangle", "triangle", "rhombus", "trapezoid"];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generateShape = () => {
    const newShape = shapes[Math.floor(Math.random() * shapes.length)];
    let dims = {};

    switch (newShape) {
      case "rectangle":
        dims = { width: rand(3, 15), height: rand(3, 15) };
        break;
      case "triangle":
        dims = { base: rand(3, 15), height: rand(3, 15) };
        break;
      case "rhombus":
        dims = { d1: rand(4, 14), d2: rand(4, 14) };
        break;
      case "trapezoid":
        dims = { base1: rand(3, 12), base2: rand(3, 12), height: rand(3, 10) };
        break;
      default:
        break;
    }

    // reset per-round states
    setShape(newShape);
    setDimensions(dims);
    setAnswer("");
    setFeedback("");
    setTime(Math.max(15 - level, 3));
  };

  const calculateArea = () => {
    const { width, height, base, base1, base2, d1, d2 } = dimensions;
    switch (shape) {
      case "rectangle":
        return width * height;
      case "triangle":
        return 0.5 * base * height;
      case "rhombus":
        return 0.5 * d1 * d2;
      case "trapezoid":
        return 0.5 * (base1 + base2) * height;
      default:
        return 0;
    }
  };

  // centralized loseLife that guarantees single handling per event
  // ✅ Unified loseLife function
const loseLife = (isTimeout = false) => {
  if (handlingRef.current) return;
  handlingRef.current = true;

  setLives((l) => {
    const newLives = l - 1;

    // always reset streak on life loss
    setStreak(0);

    // if this loss came from time-out, reset level
    if (isTimeout) setLevel(1);

    if (newLives <= 0) {
      setGameOver(true);
      setFeedback("💀 Game Over");
      handlingRef.current = false;
      return 0;
    }

    setFeedback(isTimeout ? "⏳ Time’s up!" : "❌ Wrong!");
    setLastLives(newLives);

    // wait a bit, then generate next shape and reset timer
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
      // ✅ Correct answer
      const newStreak = streak + 1;
      setStreak(newStreak);
  
      // points = streak * (2^(level - 1))
      const pointsEarned = newStreak * Math.pow(2, level - 1);
      setScore((s) => s + pointsEarned);
  
      setFeedback(`✅ +${pointsEarned} points! (Streak: ${newStreak})`);
  
      // every 5 streaks, increase level
      if (newStreak % 5 === 0) {
        setLevel((lvl) => lvl + 1);
      }
  
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = setTimeout(() => {
        generateShape();
      }, 300);
    } else {
      // ❌ Wrong answer — reset streak
      setFeedback(`❌ Wrong! (Answer: ${correctArea.toFixed(2)})`);
      setStreak(0);
      loseLife();
    }
  };
  

  // initial shape on mount
  useEffect(() => {
    if (!gameOver) generateShape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect: runs continuously (restarts only when level or gameOver changes).
  // NOTE: do NOT depend on `shape` here — that previously caused the race that double-decremented.
  useEffect(() => {
    if (gameOver) return;
  
    if (intervalRef.current) clearInterval(intervalRef.current);
  
    intervalRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          // Time runs out → lose life and don't instantly reset timer
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          loseLife(true);
          return 0; // show 0 briefly before next shape resets
        }
        return t - 1;
      });
    }, 1000);
  
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shape, level, gameOver]);
  

  const restartGame = () => {
    // clear timers and flags
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
    handlingRef.current = false;

    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    generateShape();
  };

  const renderShape = () => {
    switch (shape) {
      case "rectangle":
        return (
          <div
            className="shape rectangle"
            style={{
              width: `${dimensions.width * 15}px`,
              height: `${dimensions.height * 15}px`,
            }}
          ></div>
        );
      case "triangle":
        return (
          <div
            className="shape triangle"
            style={{
              borderBottom: `${dimensions.height * 15}px solid #ff8a00`,
              borderLeft: `${dimensions.base * 7.5}px solid transparent`,
              borderRight: `${dimensions.base * 7.5}px solid transparent`,
            }}
          ></div>
        );
      case "rhombus": {
        const { d1, d2 } = dimensions;
        return (
          <div className="shape rhombus-wrapper">
            <svg
              width={d1 * 10}
              height={d2 * 10}
              viewBox={`0 0 ${d1 * 10} ${d2 * 10}`}
            >
              <polygon
                points={`
                  ${d1 * 5},0
                  ${d1 * 10},${d2 * 5}
                  ${d1 * 5},${d2 * 10}
                  0,${d2 * 5}
                `}
                fill="#4ade80"
                stroke="#25633d"
                strokeWidth="2"
              />
              <line
                x1="0"
                y1={d2 * 5}
                x2={d1 * 10}
                y2={d2 * 5}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="2"
              />
              <line
                x1={d1 * 5}
                y1="0"
                x2={d1 * 5}
                y2={d2 * 10}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="2"
              />
            </svg>
          </div>
        );
      }
      case "trapezoid":
        {
          const { base1, base2, height } = dimensions;
          return (
            <div
              className="shape trapezoid"
              style={{
                borderBottom: `${height * 15}px solid #00d0ff`,
                borderLeft: `${(base1 - base2) * 7.5}px solid transparent`,
                borderRight: `${(base1 - base2) * 7.5}px solid transparent`,
                width: `${base2 * 15}px`,
              }}
            ></div>
          );
        }
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
          <button className="geo-btn" onClick={restartGame}>Restart</button>
        </div>
      ) : (
        <>
          <div className="geo-arena">
            {renderShape()}
            <div className="geo-info">
              <p>⏱ Time: {time}s</p>
              <p>❤️ Lives: {lives}</p>
              <p>⭐ Score: {score}</p>
              <p>⚡ Level: {level}</p>
            </div>
          </div>

          <div className="geo-dims">
            {Object.entries(dimensions).map(([k, v]) => (
              <p key={k}>
                {k}: <strong>{v}</strong> units
              </p>
            ))}
          </div>

          <form className="geo-form" onSubmit={submitAnswer}>
            <input
              type="number"
              step="0.1"
              placeholder="Enter area"
              className="geo-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button className="geo-btn" type="submit">Submit</button>
          </form>

          <p className={`geo-feedback ${feedback.includes("✅") ? "correct" : feedback.includes("❌") ? "wrong" : ""}`}>{feedback}</p>
        </>
      )}
    </div>
  );
}
