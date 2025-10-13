import React, { useState, useEffect, useRef, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";
import "../styles/PrimeOrNot.css";

// Helper function moved outside component
const smallestDivisor = (n) => {
  if (n % 2 === 0) return 2;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return i;
  }
  return n;
};

export default function PrimeOrNot({ withTimer = true, timerSeconds = 8 }) {
  const { user } = useAuth();
  const [highScore, setHighScore] = useState(0);
  const [num, setNum] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [streak, setStreak] = useState(0);
  const [showExplain, setShowExplain] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [attempts, setAttempts] = useState(0);
  const [currentTimer, setCurrentTimer] = useState(timerSeconds);
  const timerRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);



  // Fetch high score when component mounts or user changes
  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          // Game ID 6 for PrimeOrNot
          const response = await fetchHighScore(user.userid, 6);
          setHighScore(parseInt(response) || 0);
        } catch (error) {
          console.error('Failed to load high score:', error);
        }
      }
    };

    loadHighScore();
    nextNumber();
  }, [user?.userid]);

  useEffect(() => {
    if (!withTimer) return;
  
    // Prevent duplicate timers if one is already active
    if (timerRef.current) clearInterval(timerRef.current);
  
    // reset timer display
    setTimeLeft(currentTimer);

  
    let active = true;
    let timeoutTriggered = false;
  
    const tick = () => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (!timeoutTriggered) {
            timeoutTriggered = true;
            clearInterval(timerRef.current);
            timerRef.current = null;
            if (active) handleChoice(null, true); // only once
          }
          return timerSeconds;
        }
        return t - 1;
      });
    };
  
    timerRef.current = setInterval(tick, 1000);
  
    return () => {
      active = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [num, withTimer, timerSeconds]);
  
  
  

  const newNum = () => Math.floor(Math.random() * 98) + 2; // 2..99

  const nextNumber = () => {
    setNum(newNum());
    setFeedback("");
    setShowExplain(false);
    if (withTimer) {
      clearInterval(timerRef.current);
      setTimeLeft(timerSeconds);
    }
  };

  const isPrime = (n) => {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  };

  const calculateStreakPoints = (streak) => {
    const multiplier = 2 ** Math.floor(streak / 10);
    return (streak + 1) * multiplier;
  };
  
  const handleChoice = (choice, timeout = false) => {
    // choice: true => guessed prime, false => guessed not-prime, null => timeout
    const correct = isPrime(num);
    setAttempts((prev) => {
        const newAttempts = prev + 1;
    
        if (newAttempts % 8 === 0) {
          setCurrentTimer((t) => Math.max(t - 1/2, 3)); // decrease by 1 sec, min 3
        }
    
        return newAttempts;
    });
  
    if (timeout) {
      setFeedback(`⏰ Time! It was ${correct ? "prime" : "not prime"}.`);
      setStreak(0);
      setLives((l) => {
        const newLives = Math.max(l - 1, 0);
        if (newLives === 0) setGameOver(true);
      
        // Only go to next number if lives remain
        if (newLives > 0) {
          setTimeout(nextNumber, 900);
        }
      
        return newLives;
      });
      
      setShowExplain(true);
      setTimeout(() => {
        if (lives - 1 > 0) nextNumber();
      }, 900);
      return;
    }
  
    const guessed = !!choice; // true if clicked Prime
  
    if (guessed === correct) {
      setFeedback("✅ Nice! Correct.");
  
      setStreak((streak) => {
        const newStreak = streak + 1;
  
        // Calculate score with exponential streak bonus
        let multiplier = 1;
        if (newStreak >= 10) {
          // Every 10 streaks, the multiplier doubles
          const doubles = Math.floor((newStreak-1) / 10);
          multiplier = Math.pow(3, doubles);
        }
  
        const points = newStreak * multiplier/2;
        setScore((s) => s + points);
  
        return newStreak;
      });
  
      setTimeout(nextNumber, 700);
    } else {
      setFeedback(`❌ Not quite — it was ${correct ? "prime" : "not prime"}.`);
      setStreak(0);
      setLives((l) => Math.max(l - 1, 0));
      setShowExplain(true);
      setTimeout(() => {
        if (lives - 1 > 0) nextNumber();
      }, 900);
    }
  };
  

  const saveScore = async (finalScore) => {
    if (!user) return;

    try {
      const gameData = {
        userid: user.userid,
        gameid: 6, // Game ID for PrimeOrNot
        score: finalScore,
        highscore: Math.max(finalScore, highScore),
        dateplayed: new Date().toISOString()
      };

      await saveGameData(gameData);
      
      // Update high score if needed
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const resetGame = () => {
    // Save score before resetting if game was in progress
    if (score > 0) {
      saveScore(score);
    }
    
    setScore(0);
    setLives(3);
    setStreak(0);
    setFeedback("");
    setGameOver(false);
    setTimeLeft(timerSeconds);
    nextNumber();
  };

  return (
    <div className="prime-container">
      {gameOver ? (
        <div className="prime-gameover">
          <h2>💀 Game Over!</h2>
          <p>Your final score: {score}</p>
          <div className="prime-game-over-buttons">
            <button className="btn prime-play-again" onClick={resetGame}>
              Play Again
            </button>
            <button 
              className="btn prime-main-menu" 
              onClick={() => window.location.href = '/'}
            >
              Back to Main Menu
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="prime-header">
            <h1>🔢 Prime or Not?</h1>
            <div className="prime-stats">
              <div className="score-section">
                <span>⭐ {score}</span>
                {highScore > 0 && <span className="high-score">🏆 {highScore}</span>}
              </div>
              <div className="stats-section">
                <span>🔥 {streak}</span>
                <span>❤️ {lives}</span>
                {withTimer && <span>⏱ {timeLeft}s</span>}
              </div>
            </div>
          </header>

          <main className="prime-main" aria-live="polite">
            <div className="prime-card">
              <div className="prime-number">{num}</div>
              <div className="prime-buttons">
                <button
                  className="btn prime-yes"
                  onClick={() => handleChoice(true)}
                  aria-label="Prime"
                >
                  Prime
                </button>
                <button
                  className="btn prime-no"
                  onClick={() => handleChoice(false)}
                  aria-label="Not prime"
                >
                  Not Prime
                </button>
              </div>
            </div>

            <div
              className={`prime-feedback ${
                feedback.startsWith("✅") ? "good" : "bad"
              }`}
            >
              {feedback}
            </div>

            {showExplain && (
              <div className="prime-explain">
                <strong>Quick check:</strong>{" "}
                {isPrime(num)
                  ? `${num} has no divisors other than 1 and itself.`
                  : `${num} is divisible by ${smallestDivisor(num)}.`}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}