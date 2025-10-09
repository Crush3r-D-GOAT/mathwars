// src/pages/FractionMatch.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/FractionMatch.css";

export default function FractionMatch() {
  const [target, setTarget] = useState({ num: 1, den: 2 });
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [key, setKey] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [streak, setStreak] = useState(0);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState(null);
  const [fireParticles, setFireParticles] = useState([]);
  const [fallStartTime, setFallStartTime] = useState(Date.now());
  const [speed, setSpeed] = useState(1); // 1 is normal speed, higher is faster
  const [answerCount, setAnswerCount] = useState(0); // Track total number of answers
  const [launchAngle, setLaunchAngle] = useState(0); // Angle in degrees
  const fractionRef = useRef(null);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const simplify = (n, d) => {
    const g = gcd(Math.abs(n), Math.abs(d));
    return { n: n / g, d: d / g };
  };

  const genFraction = () => {
    const den = Math.floor(Math.random() * (4 + difficulty * 2)) + 2;
    const num = Math.floor(Math.random() * (den - 1)) + 1;
    return { num, den };
  };

  const newRound = () => {
    // Reset any animation classes and start time
    if (fractionRef.current) {
      fractionRef.current.classList.remove("incorrect", "explode");
      setFallStartTime(Date.now());
    }
    
    // Generate a random angle in the 3rd or 4th quadrant (180-270 degrees or 270-360 degrees)
    const randomQuadrant = Math.random() < 0.5 ? 180 : 270; // Choose between 3rd or 4th quadrant
    const randomAngle = randomQuadrant + Math.random() * 90; // Add random angle within the quadrant
    setLaunchAngle(randomAngle);
    setTarget(genFraction());
    setInput("");
    setFeedback("");
    setKey((k) => k + 1);
    
    // Force reflow to restart animation
    if (fractionRef.current) {
      fractionRef.current.style.animation = 'none';
      fractionRef.current.offsetHeight; // Trigger reflow
      const duration = Math.max(6000 - difficulty * 500, 2000) / speed;
      fractionRef.current.style.animation = `fall ${duration}ms linear forwards`;
    }
  };

  const loseLife = () => {
    setStreak(0);  // Reset streak when losing a life
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) {
        setGameOver(true);
        clearTimeout(timeoutRef.current);
      } else {
        newRound();
      }
      return newLives;
    });
  };

  const createConfetti = () => {
    const newConfetti = [];
    const colors = ['#ff0', '#f0f', '#0ff', '#f80', '#8f0', '#08f'];
    
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        id: Date.now() + i,
        left: Math.random() * 100 + '%',
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        size: Math.random() * 10 + 5
      });
    }
    
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 2000);
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (gameOver) return;

    const parts = input.split("/").map((v) => parseInt(v.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      setFeedback("❌ Invalid fraction!");
      return;
    }
    const user = simplify(parts[0], parts[1]);
    const tgt = simplify(target.num, target.den);

    // Get the user's fraction
    const userNum = parts[0];
    const userDen = parts[1];
    
    // Check if it's exactly the same fraction (not simplified)
    if (userNum === target.num && userDen === target.den) {
      setFeedback("❌ Try a different equivalent fraction!");
      return;
    }
    
    if (user.n === tgt.n && user.d === tgt.d) {
      // Check if this is the same answer as last time
      const answerString = `${userNum}/${userDen}`;
      if (answerString === lastCorrectAnswer) {
        setFeedback("❌ You already used that fraction! Try another one!");
        return;
      }
      
      // Update streak and calculate points with exponential multipliers
      const newStreak = streak + 1;
      
      // Calculate base points (1 point per correct answer in the streak)
      let points = newStreak;
      
      // Apply exponential multiplier for streaks of 10 or more
      if (newStreak >= 10) {
        const multiplier = Math.pow(2, Math.floor((newStreak - 10) / 10) + 1);
        points = newStreak * multiplier;
      }
      
      // Store this as the last correct answer
      setLastCorrectAnswer(answerString);
      
      // Add celebration effects
      fractionRef.current.classList.add("explode");
      createConfetti();
      
      // Update answer count and increase speed every 5 answers
      setAnswerCount(prev => {
        const newCount = prev + 1;
        if (newCount % 5 === 0) {
          setSpeed(s => Math.min(s + 0.2, 3)); // Cap max speed at 3x
        }
        return newCount;
      });
      
      // Update streak and score
      setStreak(newStreak);
      setScore(s => s + points);
      
      // Show feedback with streak info
      let streakBonus = '';
      if (newStreak >= 10) {
        const multiplier = Math.pow(2, Math.floor((newStreak - 10) / 10) + 1);
        streakBonus = ` (${newStreak}-streak! x${multiplier} multiplier!)`;
      } else if (newStreak > 1) {
        streakBonus = ` (${newStreak}-streak!)`;
      }
      setFeedback(`💥 Correct! +${points}${streakBonus}`);
      
      // Increase difficulty every 5 points
      if ((score + points) % 5 === 0) {
        setDifficulty(d => d + 1);
      }
      
      clearTimeout(timeoutRef.current);
      setTimeout(newRound, 1000);
    } else {
      // Reset streak on wrong answer
      setStreak(0);
      setFeedback("❌ Not equivalent! Streak lost!");
      loseLife();
      
      // Clear the feedback after 1.5 seconds
      setTimeout(() => {
        setFeedback("");
      }, 1500);
    }
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setDifficulty(1);
    setGameOver(false);
    setSpeed(1); // Reset speed on game restart
    setAnswerCount(0); // Reset answer count
    setLaunchAngle(0); // Reset launch angle
    newRound();
  };

  useEffect(() => {
    if (gameOver) return;

    // Base duration is 6 seconds, reduced by difficulty, and divided by speed
    const baseDuration = 6000 - (difficulty * 500);
    const fallDuration = Math.max(baseDuration / speed, 2000); // Minimum 2 seconds
    
    // Set timeout to lose life when animation completes
    timeoutRef.current = setTimeout(() => {
      if (!gameOver) loseLife();
    }, fallDuration);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [target, difficulty, gameOver, speed, loseLife]);

  useEffect(() => {
    newRound();
  }, []);

  return (
    <div className="fm-container" ref={containerRef}>
      <h1 className="fm-title">🧮 Fraction Match</h1>
      <div className="fm-score">Score: {score}</div>
      <div className="fm-streak">
        {streak > 0 && `🔥 ${streak}-streak!`}
      </div>
      <div className="fm-lives">Lives: {"❤️".repeat(Math.max(0, lives))}</div>
      
      {/* Confetti effect */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti"
          style={{
            left: c.left,
            backgroundColor: c.color,
            width: `${c.size}px`,
            height: `${c.size}px`,
            animationDelay: `${c.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      {gameOver ? (
        <div className="fm-gameover">
          <h2>Game Over 💀</h2>
          <p>Your Score: {score}</p>
          <button onClick={restartGame} className="fm-button">Restart</button>
        </div>
      ) : (
        <>
          <div className="fm-space">
            {!gameOver && (
              <div
                key={key}
                ref={fractionRef}
                className={`fm-fraction ${feedback.includes("Correct") ? "explode" : ""} ${feedback.includes("❌") && !feedback.includes("Correct") ? "incorrect" : ""}`}
                style={{
                  animation: `fall ${Math.max(6000 - difficulty * 500, 2000) / speed}ms linear forwards`,
                  animationPlayState: gameOver ? "paused" : "running",
                  top: '5px',
                  left: '50%',
                  transform: `translateX(-50%) rotate(${launchAngle}deg)`,
                  transformOrigin: 'center bottom',
                  position: 'absolute',
                  transition: 'all 0.3s ease',
                  willChange: 'transform, opacity',
                }}
              >
                <div className="fm-fraction-content">
                  {target.num}/{target.den}
                </div>
                {feedback.includes("Correct") && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={`fire-${i}`}
                        className="fire-particle"
                        style={{
                          transform: `rotate(${i * 45}deg) translate(30px) rotate(45deg)`,
                          animationDelay: `${i * 0.05}s`,
                          width: '20px',
                          height: '20px',
                          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            )}    
            <div className="fm-ship">⚖️</div>
          </div>

          <form onSubmit={checkAnswer} className="fm-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="fm-input"
              placeholder="Enter equivalent fraction (e.g., 2/4)"
              autoFocus
            />
            <button type="submit" className="fm-button">Match!</button>
          </form>

          <p className={`fm-feedback ${feedback.includes('Correct') ? 'correct' : ''}`}>
            {feedback}
          </p>
          <div className="fm-status">
            <span>❤️ Lives: {lives}</span>
            <span>⭐ Score: {score}</span>
            <span>⚡ Level: {difficulty}</span>
          </div>
        </>
      )}
    </div>
  );
}
