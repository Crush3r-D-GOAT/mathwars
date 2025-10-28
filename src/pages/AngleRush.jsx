import React, { useState, useEffect, useRef } from "react";
import "../styles/AngleRush.css";
import { useAuth } from "../context/AuthContext";
import { fetchHighScore, saveGameData } from "../api/client";

export default function AngleRush() {


    const types = ["acute", "right", "obtuse", "straight", "reflex"];

    const classifyAngle = (deg) => {
      if (deg < 90) return "acute";
      if (deg === 90) return "right";
      if (deg > 90 && deg < 180) return "obtuse";
      if (deg === 180) return "straight";
      return "reflex";
    };
  const { user } = useAuth();
  const [angle, setAngle] = useState(() => {
    const first = Math.ceil(Math.random() * 350) + 1;
    return first;
  });
  
  const [type, setType] = useState(() => classifyAngle(Math.ceil(Math.random() * 350) + 1));
  
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(6);
  const [gameOver, setGameOver] = useState(false);
  const [shake, setShake] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const gameSavedRef = useRef(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const timerRef = useRef(null);
  const timeOverRef = useRef(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const hasLoggedMetrics = useRef(false);



  const newAngle = () => {
    const a = Math.ceil(Math.random() * 350) + 1;
    setAngle(a);
    setType(classifyAngle(a));
    setFeedback("");
    setTimeLeft(6);
    timeOverRef.current = false;
  };

  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          const savedHighScore = await fetchHighScore(user.userid, 7); // 7 = Angle Rush game ID
          setHighScore(parseInt(savedHighScore) || 0);
        } catch (err) {
          console.error("Failed to load high score", err);
        }
      }
    };
    loadHighScore();
  }, [user?.userid]);

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
    setQuestionsAnswered(prev => prev + 1);
    
    if (timeout) {
      setFeedback("⏰ Time's up!");
      loseLife();
      return;
    }

    if (choice === type) {
      setFeedback("✅ Correct!");
      setScore((s) => {
        const newScore = s + 5 + streak;
        if (newScore > highScore) {
          setHighScore(newScore);
          setIsNewHighScore(true);
        }
        return newScore;
      });
      setStreak((st) => {
        const newStreak = st + 1;
        setMaxStreak(prevMax => Math.max(prevMax, newStreak));
        return newStreak;
      });
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
  
  // Save game exactly once when gameOver flips to true
  useEffect(() => {
    if (gameOver && !gameSavedRef.current) {
      saveGame(score);
      gameSavedRef.current = true;
    }
  }, [gameOver, score]);
  

  const logGameMetrics = (finalScore) => {
    if (hasLoggedMetrics.current) return;
    
    const metrics = {
      score: finalScore,
      streak: maxStreak,  // Changed from current streak to maxStreak
      isScoreOver1000: finalScore > 1000,
      isStreakOver10: maxStreak > 10,  // Changed to use maxStreak
      questionsAnswered: questionsAnswered,
      isQuestionsAnsweredOver20: questionsAnswered > 20
    };
    console.log('Angle Rush metrics:');
    console.log(metrics);
    hasLoggedMetrics.current = true;
  };

  const saveGame = async (finalScore) => {
    if (gameOver) {
      logGameMetrics(finalScore);
    }

    try {
      const newHighScore = Math.max(highScore, finalScore);
      const gameData = {
        userid: user.userid,
        gameid: 7, // Angle Rush
        score: finalScore,
        highscore: newHighScore,
        dateplayed: new Date().toISOString(),
      };
      await saveGameData(gameData);
      setHighScore(newHighScore);
      console.log("Angle Rush data saved:", gameData);
    } catch (err) {
      console.error("Failed to save Angle Rush game", err);
    }
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setStreak(0);
    setMaxStreak(0);
    setGameOver(false);
    setShake(false);
    setQuestionsAnswered(0);
    gameSavedRef.current = false;
    hasLoggedMetrics.current = false;
    setIsNewHighScore(false);
    newAngle();
  };

  if (gameOver) {
    return (
      <div className="angle-game-over">
        <h1>💀 Game Over!</h1>
        <p>Final Score: {score}</p>
        <p>High Score: {highScore} {isNewHighScore && "🎉 New!"}</p>
        <div className="angle-game-over-buttons">
          <button className="btn angle-play-again" onClick={resetGame}>
            Play Again
          </button>
          <button 
            className="btn angle-main-menu" 
            onClick={() => window.location.href = '/'}
          >
            Back to Main Menu
          </button>
        </div>
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
          <span>🏆 {highScore} {isNewHighScore && "🎉"}</span>
        </div>
      </header>

      <main className="angle-main">
        <div className="angle-display">
          <div className="angle-ray base" style={{ transform: `rotate(0deg)` }}></div>
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
