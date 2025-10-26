// src/components/ArithmeticBlaster.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/ArithmeticBlaster.css";

export default function ArithmeticBlaster() {
  const [question, setQuestion] = useState({});
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [combo, setCombo] = useState(0);
  const [tiles, setTiles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [showCombo, setShowCombo] = useState(false);

  const operators = ["+", "-", "×", "÷"];
  const animRef = useRef(null);
  const spawnTimeoutRef = useRef(null);
  const roundStartTime = useRef(null);
  const roundActiveRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
  }, []);

  // 🔢 Question generator
  const generateQuestion = useCallback(() => {
    clearAllTimers();
    roundActiveRef.current = true;
    roundStartTime.current = performance.now();

    const op = operators[Math.floor(Math.random() * operators.length)];
    let a = Math.floor(Math.random() * (6 + difficulty * 4)) + 1;
    let b = Math.floor(Math.random() * (6 + difficulty * 4)) + 1;
    if (op === "÷") a = a * b;

    let correctAnswer;
    switch (op) {
      case "+": correctAnswer = a + b; break;
      case "-": correctAnswer = a - b; break;
      case "×": correctAnswer = a * b; break;
      case "÷": correctAnswer = a / b; break;
      default: correctAnswer = 0;
    }

    const answers = [correctAnswer];
    while (answers.length < 3) {
      const randomAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
      if (randomAnswer > 0 && !answers.includes(randomAnswer))
        answers.push(randomAnswer);
    }
    answers.sort(() => Math.random() - 0.5);

    const newTiles = answers.map((value, index) => ({
      id: Date.now() + index,
      value,
      x: 25 + index * 25, // evenly spaced
      y: 0, // start top
      opacity: 1,
      isCorrect: value === correctAnswer,
      speed: 0.05 + Math.random() * 0.05, // slower fall
      color: "#776e65",
      backgroundColor: "#eee4da"
    }));

    setQuestion({ a, b, op, correctAnswer });
    setTiles(newTiles);
  }, [difficulty, clearAllTimers]);

  // 💥 Lose a life
  const loseLife = useCallback(() => {
    setLives(l => {
      const newLives = l - 1;
      if (newLives <= 0) setGameOver(true);
      return newLives;
    });
    setCombo(0);
  }, []);

  // 🎯 Handle click
  const handleAnswerClick = (tile) => {
    if (gameOver || !roundActiveRef.current) return;
    roundActiveRef.current = false;

    const reactionTime = (performance.now() - roundStartTime.current) / 1000;

    if (tile.isCorrect) {
      // streak bonuses
      const newCombo = combo + 1;
      let basePoints = 2;
      if (newCombo === 2) basePoints = 3;
      if (newCombo >= 10 && newCombo < 20) basePoints *= 2;
      if (newCombo >= 20) basePoints *= 4;

      // time bonuses
      if (reactionTime <= 1.5) basePoints *= 5;
      else if (reactionTime <= 1.75) basePoints *= 3;
      else if (reactionTime <= 2.5) basePoints *= 2;

      setScore(prev => prev + basePoints);
      setCombo(newCombo);

      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 800);

      setTiles(prev =>
        prev.map(t =>
          t.id === tile.id
            ? { ...t, backgroundColor: "#4CAF50", color: "#fff" }
            : { ...t, opacity: 0.5 }
        )
      );

      if ((score + basePoints) % 10 === 0)
        setDifficulty(d => d + 1);
    } else {
      loseLife();
      setTiles(prev =>
        prev.map(t =>
          t.id === tile.id
            ? { ...t, backgroundColor: "#f44336", color: "#fff" }
            : t
        )
      );
    }

    setTimeout(() => setTiles([]), 600);
  };

  // 🌀 Animate fall
  useEffect(() => {
    if (gameOver || tiles.length === 0) return;

    const animate = () => {
      setTiles(prev =>
        prev
          .map(tile => {
            const newY = tile.y + tile.speed;
            if (tile.isCorrect && newY >= 80) {
              loseLife();
              return null;
            }
            return newY > 100 ? null : { ...tile, y: newY };
          })
          .filter(Boolean)
      );
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [tiles, loseLife, gameOver]);

  // 🧩 Spawn logic
  useEffect(() => {
    if (!gameOver && tiles.length === 0 && !roundActiveRef.current) {
      spawnTimeoutRef.current = setTimeout(() => generateQuestion(), 1000);
    }
  }, [tiles, gameOver, generateQuestion]);

  useEffect(() => {
    generateQuestion();
    return clearAllTimers;
  }, []);

  return (
    <div className="ab-container">
      <h1 className="ab-title">Arithmetic Blaster</h1>

      {gameOver ? (
        <motion.div
          className="ab-gameover"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h2>Game Over 💀</h2>
          <p>Your Score: {score}</p>
          <button className="ab-button" onClick={() => window.location.reload()}>
            Play Again
          </button>
        </motion.div>
      ) : (
        <>
          <div className="ab-question">
            <h2>{question.a} {question.op} {question.b} = ?</h2>
          </div>

          <div className="ab-space">
            <AnimatePresence>
              {tiles.map(tile => (
                <motion.div
                  key={tile.id}
                  className="ab-tile"
                  style={{
                    backgroundColor: tile.backgroundColor,
                    color: tile.color
                  }}
                  animate={{
                    top: `${tile.y}vh`,
                    left: `${tile.x}%`,
                    opacity: tile.opacity
                  }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handleAnswerClick(tile)}
                >
                  {tile.value}
                </motion.div>
              ))}
            </AnimatePresence>

            {showCombo && (
              <motion.div
                className="ab-combo"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
              >
                {combo} COMBO!
              </motion.div>
            )}
            <div className="ab-ground" />
          </div>

          <div className="ab-status">
            <span>❤️ {lives}</span>
            <span>⭐ {score}</span>
            <span>⚡ Level {difficulty}</span>
            {combo > 1 && <span className="ab-combo-count">🔥 {combo}x</span>}
          </div>

          <div className="ab-instructions">
            Click the correct answer before it reaches the ground!
          </div>
        </>
      )}
    </div>
  );
}
