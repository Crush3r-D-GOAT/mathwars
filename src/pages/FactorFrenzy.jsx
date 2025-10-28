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
  const [target, setTarget] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [pickedSet, setPickedSet] = useState(new Set());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [currentTimer, setCurrentTimer] = useState(startTime);
  const [rounds, setRounds] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(null);
  const [numberFactorsSelected, setNumberFactorsSelected] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const hasLoggedMetrics = useRef(false);
  const { user } = useAuth();

  const timerRef = useRef(null);
  const timeOverRef = useRef(false);

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

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setLives(3);
    setRounds(0);
    setCurrentTimer(startTime);
    setGameOver(false);
    setFeedback("");
    setNumberFactorsSelected(0);
    hasLoggedMetrics.current = false;
    generateRound();
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
    
    // Track factor selections
    if (item.isFactor) {
      setNumberFactorsSelected((prev) => prev + 1);
    }

    if (!item.isFactor) {
      // wrong tap
      setFeedback("❌ Not a factor — you lose a life!");
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          logGameMetrics();
          setGameOver(true);
        }
        return newLives;
      });
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setFeedback(message);
    
    // Update score and streak if successful
    if (success) {
      const basePoints = 5;
      const speedBonus = Math.max(1, Math.floor(timeLeft * 0.5));
      const streakBonus = Math.min(10, Math.floor(streak / 2));
      const points = basePoints + speedBonus + streakBonus;
      
      setScore(s => s + points);
      
      setStreak(s => {
        const newStreak = s + 1;
        setMaxStreak(prevMax => Math.max(prevMax, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
    }
    
    // Update rounds and check for game over
    setRounds(r => {
      const newRounds = r + 1;
      
      // Every 8 rounds, decrease timer (min minTimer)
      if (newRounds % 8 === 0) {
        setCurrentTimer(t => Math.max(minTimer, t - 1));
      }
      
      // Start next round after a delay if not game over
      if (!gameOver) {
        setTimeout(() => {
          generateRound();
        }, 1000);
      }
      
      return newRounds;
    });
  };


  const logGameMetrics = () => {
    if (hasLoggedMetrics.current) return;
    
    const metrics = {
      score: score,
      streak: maxStreak,
      isScoreOver1000: score > 1000,
      isStreakOver10: maxStreak > 10,
      numberFactorsSelected: numberFactorsSelected,
      isnumberFactorsSelectedOver30: numberFactorsSelected > 30
    };
    console.log('FactorFrenzy metrics:');
    console.log(metrics);
    hasLoggedMetrics.current = true;
  };

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
