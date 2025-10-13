import React, { useState, useEffect, useRef } from "react";
import "../styles/FractionMatch.css";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";

export default function FractionMatch() {
  const { user } = useAuth();

  const [pos, setPos] = useState({ x: 50, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState({ type: null, message: "" });
  const [userInput, setUserInput] = useState("");
  const [targetFraction, setTargetFraction] = useState({ numerator: 1, denominator: 2 });
  const [gameComplete, setGameComplete] = useState(false);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const speedRef = useRef(0.45);
  const animationRef = useRef(null);
  const vxRef = useRef(0);
  const vyRef = useRef(0);
  const livesRef = useRef(lives);
  const gameOverRef = useRef(gameOver);
  const gameSavedRef = useRef(false);
  const hasHitBottomRef = useRef(false);

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // Load high score on mount
  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          const savedHighScore = await fetchHighScore(user.userid, 3); // Game ID 3
          setHighScore(parseInt(savedHighScore) || 0);
        } catch (err) {
          console.error("Failed to load high score", err);
        }
      }
    };
    loadHighScore();
  }, [user?.userid]);

  // Simplify fraction
  const simplifyFraction = (numerator, denominator) => {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const divisor = gcd(numerator, denominator);
    return { numerator: numerator / divisor, denominator: denominator / divisor };
  };

  // Generate random fraction
  const generateFraction = () => {
    const denominator = 2 + Math.floor(Math.random() * 12);
    const numerator = 1 + Math.floor(Math.random() * (denominator - 1));
    return { numerator, denominator };
  };

  const getRandomAngle = () => 30 + Math.random() * 120;

  const startNewRound = (reset = false) => {
    hasHitBottomRef.current = false;

    if (reset) {
      setLives(3);
      setScore(0);
      setStreak(0);
      setGameComplete(false);
      setRound(0);
      speedRef.current = 0.45;
      gameSavedRef.current = false;
    } else {
      setRound((prevRound) => {
        const newRound = prevRound + 1;
        if (newRound % 10 === 0) speedRef.current *= 1.25;
        return newRound;
      });
    }

    const newFraction = generateFraction();
    setTargetFraction(newFraction);
    setFeedback({ type: null, message: "" });
    setUserInput("");
    setGameOver(false);

    const startX = 50;
    const angle = getRandomAngle();
    const vx = Math.cos((angle * Math.PI) / 180) * speedRef.current * (Math.random() < 0.5 ? 1 : -1);
    const vy = Math.sin((angle * Math.PI) / 180) * speedRef.current;

    vxRef.current = vx;
    vyRef.current = vy;
    setPos({ x: startX, y: 5 });

    cancelAnimationFrame(animationRef.current);

    const loop = () => {
      setPos((prev) => {
        let newX = prev.x + vxRef.current;
        let newY = prev.y + vyRef.current;

        if (newX <= 5 || newX >= 95) {
          vxRef.current *= -1;
          newX = Math.min(Math.max(newX, 5), 95);
        }

        if (newY >= 95 && !hasHitBottomRef.current) {
          hasHitBottomRef.current = true;
          cancelAnimationFrame(animationRef.current);

          if (livesRef.current <= 1) {
            setGameOver(true);
            setGameComplete(true);
            saveGame(score);
          } else {
            livesRef.current -= 1;
            setLives(livesRef.current);
            setStreak(0);
            setTimeout(() => {
              hasHitBottomRef.current = false;
              startNewRound();
            }, 800);
          }

          return { x: newX, y: 90 };
        }

        return { x: newX, y: newY };
      });

      if (!gameOverRef.current) animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    startNewRound(true);
  }, []);

  const checkEquivalent = (input) => {
    const fractionRegex = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
    const match = input.match(fractionRegex);
    if (!match) return false;

    const num = parseInt(match[1]);
    const den = parseInt(match[2]);
    if (den === 0) return false;

    if (num === targetFraction.numerator && den === targetFraction.denominator) return false;

    const simpInput = simplifyFraction(num, den);
    const simpTarget = simplifyFraction(targetFraction.numerator, targetFraction.denominator);

    return simpInput.numerator === simpTarget.numerator && simpInput.denominator === simpTarget.denominator;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback.type || !userInput.trim()) return;

    const correct = checkEquivalent(userInput);

    if (correct) {
      cancelAnimationFrame(animationRef.current);
      const newStreak = streak + 1;

      let earned = newStreak;
      const multiplier = Math.pow(2, Math.floor(newStreak / 5));
      earned = newStreak * multiplier;

      setStreak(newStreak);
      setScore((s) => {
        const newScore = s + earned;
        if (newScore > highScore) {
          setHighScore(newScore);
          setIsNewHighScore(true);
        }
        return newScore;
      });

      setFeedback({ type: "correct", message: `✅ Correct! +${earned} point${earned > 1 ? "s" : ""}` });
      setTimeout(() => startNewRound(), 1000);
    } else {
      setFeedback({ type: "wrong", message: "❌ Wrong" });
      setStreak(0);
    }
  };

  const saveGame = async (finalScore) => {
    if (!user || gameSavedRef.current) return;

    try {
      const newHighScore = Math.max(highScore, finalScore);
      const gameData = {
        userid: user.userid,
        gameid: 3, // Fraction Match
        score: finalScore,
        highscore: newHighScore,
        dateplayed: new Date().toISOString(),
      };
      await saveGameData(gameData);
      gameSavedRef.current = true;
      console.log("Fraction Match data saved:", gameData);
    } catch (err) {
      console.error("Failed to save Fraction Match game", err);
    }
  };

  if (gameComplete) {
    return (
      <div className="fm-game-over-page">
        <div className="fm-game-over">
          <h2>🏆 Game Over! 🏆</h2>
          <div className="fm-score-summary">
            <p>Final Score: <span className="fm-final-score">{score}</span></p>
            <p>High Score: {highScore} {isNewHighScore && "🎉 New!"}</p>
          </div>
          <div className="fm-game-over-buttons">
            <button className="fm-button" onClick={() => startNewRound(true)}>Play Again</button>
            <button className="fm-button fm-button-secondary" onClick={() => window.location.href = '/'}>Back to Main Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-container">
      <h1 className="fm-title">Fraction Match</h1>

      <div className="fm-stats">
        <div className="fm-score-display">
          <div>Score: <span className="fm-score-value">{score}</span></div>
          <div>🔥 Streak: <span className="fm-streak-count">{streak}</span></div>
          <div>🏆 High Score: <span className="fm-highscore">{highScore}</span> {isNewHighScore && "🎉"}</div>
        </div>
        <div className="fm-lives">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`fm-heart ${i < lives ? "active" : "inactive"}`}>
              {i < lives ? "❤️" : "🖤"}
            </span>
          ))}
        </div>
      </div>

      <div className="fm-question-box">
        <p className="fm-question">
          Enter an equivalent fraction to {targetFraction.numerator}/{targetFraction.denominator}:
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="e.g., 2/4"
            className="fm-input"
            disabled={!!feedback.type && !gameOver}
            autoFocus
          />
          <button type="submit" className="fm-button" disabled={!userInput.trim() || (!!feedback.type && !gameOver)}>Submit</button>
        </form>
        {feedback.type && <div className={`fm-feedback ${feedback.type}`}>{feedback.message}</div>}
      </div>

      <div className="fm-space">
        <div className="fm-fraction" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
          {targetFraction.numerator}/{targetFraction.denominator}
        </div>
      </div>
    </div>
  );
}
