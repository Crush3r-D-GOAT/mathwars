import React, { useState, useEffect, useRef } from "react";
import "../styles/FactorFrenzy.css";
import { fetchHighScore, saveGameData } from "../api/client.js";
import { useAuth } from '../context/AuthContext';

function getFactors(n) {
  const factors = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) factors.push(i);
  }
  return factors;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FactorFrenzy({
  startTime = 8,
  minTimer = 3,
  startMinNumber = 12,
  startMaxNumber = 36,
}) {
  const [target, setTarget] = useState(null); // number
  const [candidates, setCandidates] = useState([]); // {value, id, isFactor, picked}
  const [pickedSet, setPickedSet] = useState(new Set());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [currentTimer, setCurrentTimer] = useState(startTime);
  const [rounds, setRounds] = useState(0); // total rounds completed
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(null);
  const { user } = useAuth();

  const timerRef = useRef(null);
  const timeOverRef = useRef(false); // Strict-mode safe guard

  console.log("🪞 window.user on load:", user);

// Fetch high score once at the start
    useEffect(() => {
        const loadHighScore = async () => {
        try {
            const userId = user?.userid;
            if (!userId) {
            console.warn("⚠️ No user ID found on window.user — skipping initial high score fetch.");
            return;
            }
    
            console.log("📥 Fetching initial high score...");
            const fetched = await fetchHighScore(userId, 9);
            console.log("🎯 Initial high score fetched:", fetched);
            setHighScore(fetched || 0);
        } catch (err) {
            console.error("❌ Error fetching initial high score:", err);
            setHighScore(0);
        }
        };
    
        loadHighScore();
    }, [user]);
    

    useEffect(() => {
        if (score > highScore) {
          console.log(`🏆 New high score achieved! ${score} > ${highScore}`);
          setHighScore(score);
        }
      }, [score, highScore]);

  useEffect(() => {
    if (!gameOver) return;
  
    (async () => {
      try {
        console.log("💥 Game over detected. Preparing to save game data...");
  
        const userId = user?.userid;
        if (!userId) {
          console.warn("⚠️ No user ID found on window.user — skipping save.");
          return;
        }
  
        if (typeof saveGameData === "function") {
          const payload = {
            userid: userId,  // ✅ use lowercase key names expected by backend
            gameid: 9,
            score: score,
            highscore: score, // send new score as highscore candidate
            dateplayed: new Date().toISOString()
          };
          console.log("📤 Sending game data payload:", payload);
  
          const response = await saveGameData(payload);
          console.log("✅ saveGameData response:", response);
        } else {
          console.warn("⚠️ saveGameData is not a function.");
        }
      } catch (err) {
        console.error("❌ Error saving or fetching high score:", err);
      }
    })();
  }, [gameOver]);
  
  
  
  // generate random integer in range
  const rand = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate a round: pick a number and candidates
  const generateRound = (minN = startMinNumber, maxN = startMaxNumber) => {
    // choose target number (increase difficulty slightly with rounds)
    const difficultyBoost = Math.floor(rounds / 6) * 6; // increases max number every 6 rounds
    const n = rand(minN + difficultyBoost, maxN + difficultyBoost);
    const factors = getFactors(n);

    // number of distractors: aim for grid size 8..12
    const gridSize = Math.max(8, Math.min(12, factors.length * 2 + 2));
    const distractors = new Set();
    while (distractors.size < gridSize - factors.length) {
      const cand = rand(2, Math.max(12, n + 8));
      if (n % cand !== 0 && cand !== n) distractors.add(cand);
    }

    const items = [
      ...factors.map((v) => ({ value: v, isFactor: true, id: `${n}-f-${v}`, picked: false })),
      ...Array.from(distractors).map((v) => ({ value: v, isFactor: false, id: `${n}-d-${v}`, picked: false })),
    ];

    const shuffled = shuffle(items);
    setTarget(n);
    setCandidates(shuffled);
    setPickedSet(new Set());
    setFeedback("");
    timeOverRef.current = false;
    setTimeLeft(currentTimer);
  };

  // start first round
  useEffect(() => {
    generateRound();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer effect (strict-mode safe)
  useEffect(() => {
    if (gameOver || target === null) return;

    // clear previous if any
    if (timerRef.current) clearInterval(timerRef.current);
    timeOverRef.current = false;
    setTimeLeft(currentTimer);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1 && !timeOverRef.current) {
          timeOverRef.current = true;
          // time's up: finish round as a fail
          endRound(false, "⏰ Time's up — you missed some factors!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // target and currentTimer cause restart
  }, [target, currentTimer, gameOver]);

  const pickCandidate = (id) => {
    if (gameOver) return;
    const item = candidates.find((c) => c.id === id);
    if (!item) return;
    if (pickedSet.has(id)) return; // already picked

    if (!item.isFactor) {
      // wrong tap
      setFeedback("❌ Not a factor — you lose a life!");
      setStreak(0);
      // mark picked (so it doesn't penalize repeatedly)
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, picked: true } : c)));
      setPickedSet((ps) => new Set(ps).add(id));
      // lose life immediately and end round after short delay
      setTimeout(() => {
        endRound(false, "Wrong tap — life lost");
      }, 600);
      return;
    }

    // correct tap
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, picked: true } : c)));
    setPickedSet((ps) => {
      const next = new Set(ps);
      next.add(id);
      return next;
    });

    // check if all true factors picked
    const remainingTrue = candidates.filter((c) => c.isFactor && !pickedSet.has(c.id) && c.id !== id);
    if (remainingTrue.length === 0) {
      // success: all factors picked
      setTimeout(() => endRound(true, "✅ All factors found!"), 300);
    } else {
      setFeedback("✅ Correct factor!");
    }
  };

  // end round: success boolean, message
  const endRound = (success, message) => {
    // prevent double-calls
    if (timeOverRef.current) {
      // allow handling once; do not run again
    }
    // clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // update rounds and maybe adjust timer speed
    setRounds((rPrev) => {
      const newRounds = rPrev + 1;

      // every 8 rounds, decrease currentTimer by 1 (min minTimer)
      if (newRounds % 8 === 0) {
        setCurrentTimer((t) => Math.max(minTimer, t - 1));
      }

      return newRounds;
    });

    if (success) {
      const numFactors = candidates.filter((c) => c.isFactor).length;
      // points: number of factors * (streak+1)
      setScore((s) => s + Math.floor(Math.pow(numFactors, 2) * (streak + 1)*Math.pow(1.5, Math.floor(streak/5))));
      setStreak((st) => st + 1);
      setFeedback(message || "Success!");
      // next round after short pause
      setTimeout(() => {
        generateRound();
      }, 700);
      return;
    }

    // failure: lose a life
    setLives((lPrev) => {
      const newLives = Math.max(0, lPrev - 1);
      setFeedback(message || "Failed round!");
      setStreak(0);
      if (newLives <= 0) {
        setGameOver(true);
      } else {
        // next round after pause
        setTimeout(() => {
          generateRound();
        }, 900);
      }
      return newLives;
    });
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setLives(3);
    setFeedback("");
    setRounds(0);
    setCurrentTimer(startTime);
    setGameOver(false);
    setPickedSet(new Set());
    generateRound();
  };

  if (gameOver) {
    return (
      <div className="ff-container">
        <div className="ff-card ff-game-over">
          <h2>💥 Game Over — Factor Frenzy</h2>
          <p className="ff-final">
            Final Score: <strong>{score}</strong>
          </p>
          <div className="ff-game-over-buttons">
            <button className="ff-btn ff-primary" onClick={resetGame}>
              Play Again
            </button>
            <button
              className="ff-btn ff-secondary"
              onClick={() => (window.location.href = "/")}
            >
              Back to Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }
  

  return (
    <div className="ff-container">
      <div className="ff-card">
        <header className="ff-header">
          <h1>🧩 Factor Frenzy</h1>
          <div className="ff-stats">
            <span>🏆 {score}</span>
            <span>🥇 {highScore}</span>
            <span>🔥 {streak}</span>
            <span>❤️ {lives}</span>
            <span>⏱ {timeLeft}s</span>
          </div>
        </header>

        <section className="ff-body">
          <div className="ff-target">
            <div className="ff-target-number">{target}</div>
            <div className="ff-progress">
              <div
                className="ff-progress-bar"
                style={{ width: `${(timeLeft / currentTimer) * 100}%` }}
              />
            </div>
            <p className="ff-instruction">Tap all factors of the number before time runs out.</p>
          </div>

          <div className="ff-grid" role="grid">
            {candidates.map((c) => (
              <button
                key={c.id}
                className={`ff-cell ${c.picked ? (c.isFactor ? 'ff-picked' : 'incorrect') : ''}`}
                onClick={() => pickCandidate(c.id)}
                disabled={c.picked}
                aria-pressed={c.picked}
                data-mark={c.picked ? (c.isFactor ? '✓' : '✕') : ''}
              >
                {c.value}
              </button>
            ))}
          </div>

          <div className={`ff-feedback ${feedback ? "ff-show" : ""}`}>
            {feedback}
          </div>
        </section>
      </div>
    </div>
  );
}
