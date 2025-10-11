import React, { useState, useEffect, useRef } from "react";
import "../styles/EquationBlitz.css";

export default function EquationBlitz() {
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

  const timerRef = useRef(null);
  const timeOverRef = useRef(false); // ✅ Strict-mode safe flag

  // 🎯 Generate random linear equation ax + b = c
  const generateEquation = () => {
    const a = Math.ceil(Math.random() * 9);
    const x = Math.ceil(Math.random() * 12);
    const b = Math.ceil(Math.random() * 15);
    const c = a * x + b;
    if(a==1){
        setEquation(`x + ${b} = ${c}`);
    }
    else{
        setEquation(`${a}x + ${b} = ${c}`);
    }
    setAnswer(x);
    setInput("");
    setFeedback("");
    setTimeLeft(10);
    timeOverRef.current = false;
  };

  useEffect(() => {
    generateEquation();
  }, []);

  // ⏱ Timer logic
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
      setScore((s) => Math.floor(s + Math.min(Math.floor(s/2+5), s) * Math.pow(streak, 0.2)+1));
      setStreak((st) => st + 1);
      setTimeout(generateEquation, 800);
    } else {
      setFeedback(` Nope — x = ${answer}`);
      loseLife();
    }
  };

  const loseLife = () => {
    setStreak(0);
    const newLives = lives - 1;
    setLives(newLives);
    setAnimateLife(true);
    
    // Remove animation class after animation completes
    setTimeout(() => setAnimateLife(false), 1000);
    
    if (newLives <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
    } else {
      setTimeout(generateEquation, 900);
    }
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setStreak(0);
    setAttempts(0);
    setGameOver(false);
    generateEquation();
  };

  if (gameOver) {
    return (
      <div className="eq-container game-over">
        <h1>💀 Game Over!</h1>
        <p>Final Score: {score}</p>
        <button className="btn play-again" onClick={resetGame}>
          Play Again
        </button>
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
          <span className={animateLife ? 'lose-life-animation' : ''}>
            ❤️ {lives}
          </span>
          <span>⏱ {timeLeft}s</span>
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

        <div
          className={`eq-feedback ${feedback.startsWith("✅") ? "good" : "bad"}`}
        >
          {feedback}
        </div>
      </main>
    </div>
  );
}