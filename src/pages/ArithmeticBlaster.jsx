// src/components/ArithmeticBlaster.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/ArithmeticBlaster.css";

export default function ArithmeticBlaster() {
  const [question, setQuestion] = useState({});
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [falling, setFalling] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [tiles, setTiles] = useState([]);
  const animRef = useRef(null);
  const inputRef = useRef(null);
  const animRunningRef = useRef(false);

  const operators = ["+", "-", "×", "÷"];

  const generateQuestion = useCallback(() => {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a = Math.floor(Math.random() * (6 + difficulty * 4)) + 1;
    let b = Math.floor(Math.random() * (6 + difficulty * 4)) + 1;
    if (op === "÷") a = a * b;
    
    // Calculate correct answer
    let correctAnswer;
    switch (op) {
      case "+": correctAnswer = a + b; break;
      case "-": correctAnswer = a - b; break;
      case "×": correctAnswer = a * b; break;
      case "÷": correctAnswer = a / b; break;
      default: correctAnswer = 0;
    }
    
    // Generate 4 answer choices including the correct one
    const answers = [correctAnswer];
    while (answers.length < 4) {
      const randomAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
      if (randomAnswer !== correctAnswer && !answers.includes(randomAnswer) && randomAnswer > 0) {
        answers.push(randomAnswer);
      }
    }
    
    // Shuffle answers
    answers.sort(() => Math.random() - 0.5);
    
    // Create answer tiles with more spacing
    const newTiles = answers.map((value, index) => ({
      id: Date.now() + index,
      value,
      x: 15 + (index * 100), // More spacing between tiles (reduced from 25 to 20 for better fit)
      y: -20, // Start above the visible area
      opacity: 1,
      isCorrect: value === correctAnswer,
      speed: 0.5 + Math.random() * 0.5 // Random falling speed
    }));
    
    setTiles(newTiles);
    setQuestion({ a, b, op, correctAnswer });
    setFeedback("");
    setShowFeedback(false);
  }, [difficulty]);

  const stopFalling = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const loseLife = useCallback(() => {
    stopFalling(); // ✅ immediately stop any leftover animation
    setLives(l => {
      const newLives = l - 1;
      if (newLives <= 0) {
        setGameOver(true);
      } else {
        setTiles([]); // clear for next question
      }
      return newLives;
    });
    setCombo(0);
  }, [stopFalling]);
  

  const handleAnswerClick = (tile) => {
    if (gameOver) return;
    
    setShowFeedback(true);
    
    if (tile.isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setFeedback("💥 CORRECT!");
      setScore((s) => s + 1);
      
      if (newCombo > 1) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 1000);
      }
      
      if ((score + 1) % 5 === 0) setDifficulty((d) => d + 1);
      
      // Show all tiles with correct/incorrect feedback
      setTiles(prevTiles => 
        prevTiles.map(t => ({
          ...t,
          // Fade out all tiles
          opacity: 0.5,
          // Use consistent color format (all hex values)
          backgroundColor: t.isCorrect ? '#4CAF50' : '#f44336',
          color: '#ffffff',
          // Animate the clicked tile up
          y: t.id === tile.id ? t.y - 20 : t.y,
          transition: { 
            duration: 0.3,
            backgroundColor: { duration: 0.3 },
            color: { duration: 0.3 }
          }
        }))
      );
      
      // Remove all tiles after a delay
      setTimeout(() => {
        setTiles([]);
      }, 800);
    } else {
      setCombo(0);
      setFeedback("❌ WRONG!");
      
      // Show all tiles with correct/incorrect feedback
      setTiles(prevTiles => 
        prevTiles.map(t => ({
          ...t,
          // Use consistent color format (all hex values)
          backgroundColor: t.isCorrect ? '#4CAF50' : (t.id === tile.id ? '#f44336' : '#eee4da'),
          color: t.isCorrect || t.id === tile.id ? '#ffffff' : '#776e65',
          // Shake the wrong answer
          x: t.id === tile.id ? [t.x, t.x + 5, t.x - 5, t.x + 5, t.x] : t.x,
          transition: { 
            duration: 0.3,
            backgroundColor: { duration: 0.3 },
            color: { duration: 0.3 }
          }
        }))
      );
      
      // Remove all tiles after a delay
      setTimeout(() => {
        setTiles([]);
      }, 1000);
      
      loseLife();
    }
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setDifficulty(1);
    setCombo(0);
    setGameOver(false);
    setTiles([]);
    generateQuestion();
  };

  useEffect(() => {
    if (!gameOver && tiles.length === 0 && !animRunningRef.current) {
      // slight delay to let old animation cleanup
      const timeout = setTimeout(() => {
        generateQuestion();
        animRunningRef.current = true;
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [tiles, gameOver, generateQuestion]);
  
  // Initialize game
  useEffect(() => {
    generateQuestion();
  }, []);

// 🎯 Animation + round management
// 🧩 Prevent double life losses due to React Strict Mode
const timeOverRef = useRef(false);

// 🎮 Animation loop and round logic
useEffect(() => {
  if (gameOver) return;

  let frameId;
  let stopped = false;

  const animate = () => {
    setTiles(prevTiles => {
      if (prevTiles.length === 0) return prevTiles;

      const updated = prevTiles.map(tile => {
        const newY = tile.y + tile.speed;

        // Check if the correct tile hit the ground
        if (newY > 60 && tile.isCorrect && !timeOverRef.current) {
          timeOverRef.current = true; // prevent multiple losses
          loseLife();
          return null;
        }

        // Remove all tiles once they fall beyond the screen
        if (newY > 110) return null;

        return { ...tile, y: newY };
      }).filter(Boolean);

      return updated;
    });

    if (!stopped) frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  return () => {
    stopped = true;
    cancelAnimationFrame(frameId);
  };
}, [gameOver, loseLife]);

// 🧠 Watcher: when all tiles are gone, spawn a new question
useEffect(() => {
  if (!gameOver && tiles.length === 0) {
    const timeout = setTimeout(() => {
      timeOverRef.current = false; // reset protection for new round
      generateQuestion();
    }, 800); // small delay between rounds
    return () => clearTimeout(timeout);
  }
}, [tiles, gameOver, generateQuestion]);



  return (
    <div className="ab-container">
      <h1 className="ab-title"> Arithmetic Blaster</h1>
      {gameOver ? (
        <motion.div 
          className="ab-gameover"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <h2>Game Over 💀</h2>
          <p>Your Score: {score}</p>
          <motion.button 
            onClick={restartGame} 
            className="ab-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Again
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="ab-question">
            <h2>{question.a} {question.op} {question.b} = ?</h2>
          </div>
          
          <div className="ab-space">
            <AnimatePresence>
              {tiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  className="ab-tile"
                  style={{
                    backgroundColor: tile.backgroundColor || '#eee4da',
                    color: tile.color || '#776e65'
                  }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ 
                    y: `${tile.y}vh`,
                    x: `${tile.x}%`,
                    opacity: tile.opacity !== undefined ? tile.opacity : 1,
                    scale: tile.opacity === 1 ? 1 : 0.8,
                    backgroundColor: tile.backgroundColor || '#eee4da',
                    color: tile.color || '#776e65'
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    y: { type: 'spring', stiffness: 100, damping: 10 },
                    scale: { duration: 0.3 },
                    default: { duration: 0.2 },
                    x: { duration: 0.3 },
                    backgroundColor: { duration: 0.3 },
                    color: { duration: 0.3 }
                  }}
                  onClick={() => handleAnswerClick(tile)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tile.value}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {showFeedback && (
              <motion.div
                className="ab-feedback"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: -40 }}
                exit={{ opacity: 0, y: -60 }}
              >
                {feedback}
              </motion.div>
            )}
            
            {showCombo && (
              <motion.div
                className="ab-combo"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
              >
                {combo} COMBO!
              </motion.div>
            )}
            <div className="ab-ground" />
          </div>

          <div className="ab-status">
            <motion.span 
              className={lives <= 1 ? 'ab-warning' : ''}
              animate={{ scale: lives <= 1 ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: lives <= 1 ? Infinity : 0, duration: 1 }}
            >
              ❤️ {lives}
            </motion.span>
            <span>⭐ {score}</span>
            <span>⚡ Level {difficulty}</span>
            {combo > 1 && <span className="ab-combo-count">🔥 {combo}x</span>}
          </div>
          
          <div className="ab-instructions">
            <p>Click the correct answer before it reaches the bottom!</p>
          </div>
        </>
      )}
    </div>
  );
}
