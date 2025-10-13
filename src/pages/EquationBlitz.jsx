import React, { useState, useEffect, useRef } from "react";
import "../styles/EquationBlitz.css";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";

export default function EquationBlitz() {
  const { user } = useAuth();

  // Strict-mode safe refs
  const timerRef = useRef(null);
  const timeOverRef = useRef(false);
  const gameSavedRef = useRef(false);

  const [equation, setEquation] = useState("");
  const [answer, setAnswer] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [animateLife, setAnimateLife] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // 🎯 Generate equation
  const generateEquationValue = () => {
    const a = Math.ceil(Math.random() * 9);
    const x = Math.ceil(Math.random() * 12);
    const b = Math.ceil(Math.random() * 15);
    const c = a * x + b;
    const eq = a === 1 ? `x + ${b} = ${c}` : `${a}x + ${b} = ${c}`;
    return { equation: eq, answer: x };
  };

  const generateEquation = () => {
    const { equation: eq, answer: ans } = generateEquationValue();
    setEquation(eq);
    setAnswer(ans);
    setInput("");
    setFeedback("");
    setTimeLeft(10);
    timeOverRef.current = false;
  };

  // Initialize first equation immediately
  useEffect(() => {
    const first = generateEquationValue();
    setEquation(first.equation);
    setAnswer(first.answer);
  }, []);

  // Load high score on mount
  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          const savedHighScore = await fetchHighScore(user.userid, 8); // 8 = Equation Blitz
          setHighScore(parseInt(savedHighScore) || 0);
        } catch (err) {
          console.error("Failed to load high score", err);
        }
      }
    };
    loadHighScore();
  }, [user?.userid]);

  // Timer
  useEffect(() => {
    if (gameOver) return;
    timeOverRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1 && !timeOverRef.current) {
          timeOverRef.current = true;
          handleSubmit(true);
          return 10;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [equation, gameOver]);

  const handleSubmit = (timeout = false) => {
    setAttempts((a) => {
      const newA = a + 1;
      if (newA % 8 === 0) {
        setTimeLeft((t) => Math.max(t - 1, 3));
      }
      return newA;
    });

    if (timeout) {
      setFeedback("⏰ Time’s up!");
      loseLife();
      return;
    }

    const userAns = Number(input);
    if (userAns === answer) {
      setFeedback("✅ Correct!");
      setScore((s) => {
        const newScore = Math.floor(s + Math.min(Math.floor(s / 2 + 5), s) * Math.pow(streak, 0.2) + 1);
        if (newScore > highScore) {
          setHighScore(newScore);
          setIsNewHighScore(true);
        }
        return newScore;
      });
      setStreak((st) => st + 1);
      setTimeout(generateEquation, 800);
    } else {
      setFeedback(`❌ Nope — x = ${answer}`);
      loseLife();
    }
  };

  const loseLife = () => {
    setStreak(0);
    const newLives = lives - 1;
    setLives(newLives);
    setAnimateLife(true);

    setTimeout(() => setAnimateLife(false), 1000);

    if (newLives <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      saveGame(score);
    } else {
      setTimeout(generateEquation, 900);
    }
  };

  const saveGame = async (finalScore) => {
    if (!user || gameSavedRef.current) return;

    try {
      const newHighScore = Math.max(highScore, finalScore);
      const gameData = {
        userid: user.userid,
        gameid: 8,
        score: finalScore,
        highscore: newHighScore,
        dateplayed: new Date().toISOString(),
      };
      await saveGameData(gameData);
      gameSavedRef.current = true;
      console.log("Equation Blitz data saved:", gameData);
    } catch (err) {
      console.error("Failed to save Equation Blitz game", err);
    }
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setStreak(0);
    setAttempts(0);
    setGameOver(false);
    setIsNewHighScore(false);
    gameSavedRef.current = false;
    generateEquation();
  };

  if (gameOver) {
    return (
      <div className="eq-container game-over">
        <h1>💀 Game Over!</h1>
        <p>Final Score: {score}</p>
        <p>High Score: {highScore} {isNewHighScore && "🎉 New!"}</p>
        <div className="eq-game-over-buttons">
          <button className="btn eq-play-again" onClick={resetGame}>
            Play Again
          </button>
          <button
            className="btn eq-main-menu"
            onClick={() => window.location.href = '/'}
          >
            Back to Main Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="eq-container">
      <header className="eq-header">
        <h1>🧮 Equation Blitz</h1>
        <div className="eq-stats">
          <span>⭐ {score}</span>
          <span>🔥 {streak}</span>
          <span className={animateLife ? 'lose-life-animation' : ''}>❤️ {lives}</span>
          <span>⏱ {timeLeft}s</span>
          <span>🏆 {highScore} {isNewHighScore && "🎉"}</span>
        </div>
      </header>

      <main className="eq-main">
        <div className="eq-equation">{equation}</div>

        <input
          className="eq-input"
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter x"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <button className="btn eq-submit" onClick={() => handleSubmit()}>
          Submit
        </button>

        <div className={`eq-feedback ${feedback.startsWith("✅") ? "good" : "bad"}`}>
          {feedback}
        </div>
      </main>
    </div>
  );
}
