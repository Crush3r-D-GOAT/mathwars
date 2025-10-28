import React, { useState, useEffect, useRef } from "react";
import "../styles/PiMemoryGame.css";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";

const PI_DIGITS = "3.14159265358979323846264338327950288419716939937510";

export default function PiMemoryGame() {
  const [level, setLevel] = useState(1);
  const [display, setDisplay] = useState("");
  const [userInput, setUserInput] = useState("");
  const [phase, setPhase] = useState("show");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const interval = useRef(null);
  const [startTime, setStartTime] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const {user} = useAuth();
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [digitsEntered, setDigitsEntered] = useState(0);
  const maxLevelReached = useRef(1);


  useEffect(() => {
      const loadHighScore = async () => {
        try {
          const userId = user?.userid;
          if (!userId) {
            console.warn("No user ID found — skipping high score fetch.");
            return;
          }
    
          console.log("Fetching initial high score...");
          const fetched = await fetchHighScore(userId, 5);
          console.log("Initial high score fetched:", fetched);
          setHighScore(fetched || 0);
        } catch (err) {
          console.error("Error fetching initial high score:", err);
          setHighScore(0);
        }
      };
    
      loadHighScore();
    }, [user]);
    
    useEffect(() => {
      if (score > highScore) {
        console.log(`🏆 New high score during game! ${score} > ${highScore}`);
        setHighScore(score);
      }
    }, [score, highScore]);
    
    useEffect(() => {
      if (!gameOver) return;
    
      const saveData = async () => {
        try {
          const userId = user?.userid;
          if (!userId) {
            console.warn("⚠️ No user ID found — skipping save.");
            return;
          }
          
          const metrics = {
            score: score,
            streak: maxStreak,
            scoreOver1000: score > 1000,
            streakOver10: maxStreak >= 10,
            digits_entered: digitsEntered,
            isMaxLevelOver10: maxLevelReached.current >= 10
          };
          console.log('Pi Memory Game metrics:', metrics);
    
          console.log("💾 Saving game data to backend...");
          await saveGameData({
            userid: userId,
            gameid: 5,
            score: score,
            highscore: highScore,
            dateplayed: new Date().toISOString(),
          });
    
          const updatedHigh = await fetchHighScore(userId, 5);
          console.log("Updated high score fetched after save:", updatedHigh);
          setHighScore(updatedHigh || highScore);
        } catch (err) {
          console.error("❌ Error saving game data:", err);
        }
      };
    
      saveData();
    }, [gameOver, score, maxStreak, digitsEntered, highScore, user]);
  useEffect(() => {
    startRound(1);
    return () => clearInterval(interval.current);
  }, []);

  const startRound = (newLevel) => {
    setPhase("show");
    setUserInput("");
    setMessage("");
    setDisplay("");
    clearInterval(interval.current);
    
    if (newLevel > maxLevelReached.current) {
      maxLevelReached.current = newLevel;
    }

    const seq = PI_DIGITS.slice(0, newLevel + 1);
    let index = 0;

    interval.current = setInterval(() => {
      if (index <= seq.length) {
        setDisplay(seq.slice(0, index));
        index++;
      } else {
        clearInterval(interval.current);
        setTimeout(() => {
          setDisplay("");
          setPhase("input");
          setStartTime(Date.now());
        }, 700);
      }
    }, 400);
  };

  const calculateBonus = (timeTaken, maxLength) => {
    const seconds = timeTaken / 1000;
    const thirdThreshold = (maxLength / 3)+0.5;
    const tenthThreshold = (maxLength / 10)+0.5;
  
    if (seconds < tenthThreshold){
      console.log("tenth")
      return 1.50;
    } // +10%
    if (seconds < thirdThreshold){
      console.log("third")
      return 1.20;
    }
    else{
      console.log("else")
      return 1.0;
    }
  };
  

  const handleChange = (e) => {
    let val = e.target.value;
    const maxLength = level + 1;
  
    // Prevent typing extra digits
    if (val.length > maxLength) val = val.slice(0, maxLength);
    setUserInput(val);
    
    // Track digits entered
    if (val.length > userInput.length) {
      setDigitsEntered(prev => prev + 1);
    }
  
    // When full input entered, auto-submit after short delay
    if (val.length === maxLength) {
      const timeTaken = Date.now() - startTime; // measure typing time
      const bonusMultiplier = calculateBonus(timeTaken, maxLength); // compute bonus %
  
      setTimeout(() => {
        const correct = PI_DIGITS.slice(0, maxLength);
        if (val === correct) {
          const nextLevel = level + 1;
          const basePoints = nextLevel;
          const totalPoints = Math.round(basePoints * bonusMultiplier);
          const newStreak = streak + 1;
          
          setScore((s) => s + totalPoints);
          setStreak(newStreak);
          setMaxStreak(prev => Math.max(prev, newStreak));
          setLevel(nextLevel);
          startRound(nextLevel);
        } else {
          setStreak(0);
          setPhase("gameover");
          setGameOver(true);
          setMessage(`❌ Wrong! Correct was ${correct}`);
        }
      }, 500); // 2-second suspense delay
    }
  };
  

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>PI MEMORY CHALLENGE</h1>
        <p className="subtitle">Memorize and recall the digits of π</p>
      </div>

      <div className="game-content">
        {phase === "show" && (
          <div className="pi-display">
            {display.split('').map((digit, index) => (
              <span key={index} className="pi-digit">
                {digit}
              </span>
            ))}
          </div>
        )}

        {phase === "input" && (
          <div className="input-container">
            <input
              type="text"
              value={userInput}
              onChange={handleChange}
              className="game-input"
              placeholder={`Enter first ${level + 2} digits of π`}
              maxLength={level + 2}
              autoFocus
            />
          </div>
        )}

        {phase === "gameover" && (
          <div className="game-over">
            <h2>GAME OVER</h2>
            <p className="message">{message}</p>
            <p className="score-display">Score: {score}</p>
            <div className="button-group">
              <button
                onClick={() => {
                  setLevel(1);
                  setScore(0);
                  setStreak(0);
                  setDigitsEntered(0);
                  startRound(1);
                  setGameOver(false);
                }}
                className="btn-primary"
              >
                TRY AGAIN
              </button>
              <Link to="/games" className="btn-secondary">
                BACK TO GAMES
              </Link>
            </div>
          </div>
        )}

        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">HIGHSCORE</span>
            <span className="stat-value">{highScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">LEVEL</span>
            <span className="stat-value">{level}</span>
          </div>
          <div className="stat">
            <span className="stat-label">STREAK</span>
            <span className="stat-value">{streak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
