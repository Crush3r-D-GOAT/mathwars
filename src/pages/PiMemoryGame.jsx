import React, { useState, useEffect, useRef } from "react";
import "../styles/PiMemoryGame.css";

const PI_DIGITS = "3.14159265358979323846264338327950288419716939937510";

export default function PiMemoryGame() {
  const [level, setLevel] = useState(1);
  const [display, setDisplay] = useState("");
  const [userInput, setUserInput] = useState("");
  const [phase, setPhase] = useState("show"); // "show" | "input" | "gameover"
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const interval = useRef(null);

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

    const seq = PI_DIGITS.slice(0, newLevel + 2);
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
        }, 700);
      }
    }, 400);
  };

  const handleChange = (e) => {
    let val = e.target.value;
    const maxLength = level + 2;
  
    if (val.length > maxLength) val = val.slice(0, maxLength);
    setUserInput(val);
  
    // auto-submit when full with 2-second delay
    if (val.length === maxLength) {
      setTimeout(() => {
        const correct = PI_DIGITS.slice(0, maxLength);
        if (val === correct) {
          const nextLevel = level + 1;
          setScore((s) => s + nextLevel);
          setLevel(nextLevel);
          startRound(nextLevel);
        } else {
          setPhase("gameover");
          setMessage(`❌ Wrong! Correct was ${correct}`);
        }
      }, 500); // 2-second delay
    }
  };  

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-indigo-50 to-indigo-100 text-center font-sans">
      <h1 className="text-4xl font-bold mb-6">🥧 Pi Memory Challenge</h1>

      {phase === "show" && (
        <div
          className="text-5xl font-mono mb-6 transition-all duration-200 ease-in-out animate-blink"
          style={{ letterSpacing: "0.1em", minHeight: "1.2em" }}
        >
          {display}
        </div>
      )}

      {phase === "input" && (
        <div className="flex flex-col items-center">
          <input
            type="text"
            value={userInput}
            onChange={handleChange}
            className="border-2 border-indigo-400 rounded-lg text-2xl text-center px-4 py-2 mb-3 focus:outline-none font-mono"
            placeholder={`Enter first ${level + 2} digits of π`}
            maxLength={level + 2}
            autoFocus
          />
        </div>
      )}

      {phase === "gameover" && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-red-500 mb-3">Game Over!</h2>
          <p className="mb-2">{message}</p>
          <p className="text-lg mb-4">You reached {level} digits.</p>
          <button
            onClick={() => {
              setLevel(1);
              setScore(0);
              startRound(1);
            }}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="mt-6 text-lg">
        <p>Score: {score}</p>
        <p>Level: {level}</p>
      </div>
    </div>
  );
}
