import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";
import "../styles/SlopeSprint.css";

export default function SlopeSprint() {
  const { user } = useAuth();
  const [points, setPoints] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [options, setOptions] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(7);
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const hasLoggedMetrics = useRef(false);
  const timerRef = useRef(null);
  const timeOverRef = useRef(false);

  const simplifyFraction = (numerator, denominator) => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const commonDivisor = gcd(Math.abs(numerator), Math.abs(denominator));
    const simplifiedNum = numerator / commonDivisor;
    const simplifiedDen = denominator / commonDivisor;
    
    if (simplifiedDen === 1) return simplifiedNum.toString();
    if (simplifiedDen < 0) return `${-simplifiedNum}/${-simplifiedDen}`;
    return `${simplifiedNum}/${simplifiedDen}`;
  };

  const newQuestion = () => {
    let x1, y1, x2, y2, slopeNum, slopeDen;
    
    // Generate points for slope calculation
    do {
      x1 = Math.floor(Math.random() * 10) - 5;
      y1 = Math.floor(Math.random() * 10) - 5;
      x2 = Math.floor(Math.random() * 10) - 5;
      y2 = Math.floor(Math.random() * 10) - 5;
      
      // Ensure valid slope (not vertical or horizontal)
      if (x1 === x2 || y1 === y2) continue;
      
      // Calculate slope
      slopeNum = y2 - y1;
      slopeDen = x2 - x1;
      
      // Make sure the fraction isn't too complex (denominator between -10 and 10)
      if (Math.abs(slopeDen) <= 10 && Math.abs(slopeNum) <= 20) break;
    } while (true);

    const correctSlope = { 
      decimal: (slopeNum / slopeDen).toFixed(2),
      fraction: simplifyFraction(slopeNum, slopeDen),
      value: slopeNum / slopeDen
    };
    
    setAnswer(correctSlope);

    // Generate wrong options
    const wrongOptions = [];
    while (wrongOptions.length < 3) {
      // Generate a fraction with denominator between -10 and 10 (excluding 0)
      const wrongDen = Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1) || 1;
      const wrongNum = Math.floor(Math.random() * 20) * (Math.random() > 0.5 ? 1 : -1);
      
      // Skip if the fraction simplifies to the correct answer
      const simplified = simplifyFraction(wrongNum, wrongDen);
      const decimal = (wrongNum / wrongDen).toFixed(2);
      
      if (decimal !== correctSlope.decimal && !wrongOptions.some(opt => opt.decimal === decimal)) {
        wrongOptions.push({
          decimal,
          fraction: simplified,
          value: wrongNum / wrongDen
        });
      }
    }

    const allOptions = [...wrongOptions, correctSlope].sort(() => Math.random() - 0.5);
    setPoints({ x1, y1, x2, y2 });
    setOptions(allOptions);
    setFeedback("");
    setTimeLeft(Math.max(3, 7 - Math.floor(round / 5))); // faster every 5 rounds
    timeOverRef.current = false;
  };

  // 🧠 1️⃣ Fetch initial high score when user loads
useEffect(() => {
    const loadHighScore = async () => {
      try {
        const userId = user?.userid;
        if (!userId) {
          console.warn("⚠️ No user ID found — skipping high score fetch.");
          return;
        }
  
        console.log("📥 Fetching initial high score...");
        const fetched = await fetchHighScore(userId, 10);
        console.log("🎯 Initial high score fetched:", fetched);
        setHighScore(fetched || 0);
      } catch (err) {
        console.error("❌ Error fetching initial high score:", err);
        setHighScore(0);
      }
    };
  
    loadHighScore();
  }, [user]);
  
  // 🏆 2️⃣ Live update local high score during gameplay
  useEffect(() => {
    if (score > highScore) {
      console.log(`🏆 New high score during game! ${score} > ${highScore}`);
      setHighScore(score);
    }
  }, [score, highScore]);
  
  // 💾 3️⃣ Save data to backend when game ends
  useEffect(() => {
    if (!gameOver) return;
  
    const saveData = async () => {
      try {
        const userId = user?.userid;
        if (!userId) {
          console.warn("⚠️ No user ID found — skipping save.");
          return;
        }
  
        console.log("💾 Saving game data to backend...");
        await saveGameData({
          userId: userId,
          gameId: 10, // Slope Sprint
          score: score,
          highscore: highScore,
          dateplayed: new Date().toISOString(),
        });
  
        // 🔁 Re-fetch updated high score to confirm
        const updatedHigh = await fetchHighScore(userId, 10);
        console.log("📈 Updated high score fetched after save:", updatedHigh);
        setHighScore(updatedHigh || highScore);
      } catch (err) {
        console.error("❌ Error saving game data:", err);
      }
    };
  
    saveData();
  }, [gameOver]);

  const handleChoice = (choice, timeout = false) => {
    if (timeout) {
      setFeedback(" Time's up!");
      setQuestionsAnswered(prev => prev + 1);
      loseLife();
      return;
    }

    setRound((r) => r + 1);
    setQuestionsAnswered(prev => prev + 1);

    if (choice && Math.abs(choice.value - answer.value) < 0.01) {
      setFeedback(" Correct!");
      setScore((s) => s + (1 + streak)*Math.pow(2, Math.floor(streak/10)));
      setStreak((st) => st + 1);
      setTimeout(newQuestion, 800);
    } else {
      setFeedback(` Incorrect! The correct slope was ${answer.fraction}`);
      // Add shake animation class to the options container
      const optionsEl = document.querySelector('.ss-options');
      if (optionsEl) {
        optionsEl.classList.add('ss-shake');
        setTimeout(() => optionsEl.classList.remove('ss-shake'), 1000);
      }
      loseLife();
    }
  };

  const logGameMetrics = () => {
    if (hasLoggedMetrics.current) return;
    
    const metrics = {
      score: score,
      streak: streak,
      isScoreOver1000: score > 1000,
      isStreakOver10: streak > 10,
      questionsAnswered: questionsAnswered,
      isQuestionsAnsweredOver20: questionsAnswered > 20
    };
    
    console.log('SlopeSprint metrics:', metrics);
    hasLoggedMetrics.current = true;
  };

  const loseLife = () => {
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) {
        clearInterval(timerRef.current);
        setGameOver(true);
      } else {
        setTimeout(newQuestion, 900);
      }
      return newLives;
    });
  };

  useEffect(() => {
    newQuestion();
  }, []);

  // This effect will call logGameMetrics when gameOver changes to true
  useEffect(() => {
    if (gameOver) {
      logGameMetrics();
    }
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;

    timeOverRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1 && !timeOverRef.current) {
          timeOverRef.current = true;
          handleChoice(null, true);
          return 7;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [points, gameOver]);

  const resetGame = async () => {
    // Save score before resetting if game was in progress
    if (score > 0 && user?.userid) {
      try {
        await saveGameData({
          userid: user.userid,
          gameid: 10, // 10 is the game ID for SlopeSprint
          score: score,
          highscore: score,
          dateplayed: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error saving game data:", err);
      }
    }
    
    // Reset game state
    setScore(0);
    setStreak(0);
    setLives(3);
    setGameOver(false);
    setTimeLeft(7);
    setRound(0);
    setQuestionsAnswered(0);
    hasLoggedMetrics.current = false;
    newQuestion();
  };

  if (gameOver) {
    return (
      <div className="ss-container ss-game-over">
        <h1> Game Over!</h1>
        <h1>🏁 Game Over!</h1>
        <p className="final-score">Your Score: <span>{score}</span></p>
        <div className="ss-game-over-buttons">
          <button className="btn ss-play-again" onClick={resetGame}>
            Play Again
          </button>
          <button 
            className="btn ss-main-menu" 
            onClick={() => window.location.href = '/'}
          >
            Back to Main Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-container">
      <header className="ss-header">
        <h1> Slope Sprint</h1>
        <div className="ss-stats">
          <div className="score-section">
            <span>⭐ {score}</span>
            {highScore > 0 && <span className="high-score">🏆 {highScore}</span>}
          </div>
          <div className="stats-section">
            <span>🔥 {streak}</span>
            <span>❤️ {lives}</span>
            <span>⏱ {timeLeft}s</span>
          </div>
        </div>
      </header>

      <main className="ss-main">
        <div className="ss-question">
          <p>
            Find the slope between points{' '}
            <strong>({points.x1}, {points.y1})</strong> and{' '}
            <strong>({points.x2}, {points.y2})</strong>
          </p>
        </div>

        <div className="ss-options">
          {options.map((opt, index) => (
            <button
              key={index}
              className="btn ss-option"
              onClick={() => handleChoice(opt)}
            >
              {opt.fraction}
            </button>
          ))}
        </div>

        <div className={`ss-feedback ${feedback.startsWith("✅") ? "good" : "bad"}`}>
          {feedback}
        </div>
      </main>
    </div>
  );
}
