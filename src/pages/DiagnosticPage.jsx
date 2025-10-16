import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { generateDiagnosticQuestions } from "../utils/diagnosticQuestions";
import "../styles/diagnostic.css";
import { saveDiagnosticResults, updateDiagnosticStatus } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DiagnosticPage() {
  
  const {user} = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQ = questions[current];
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    setQuestions(generateDiagnosticQuestions());
  }, []);

  if (questions.length === 0) {
    return (
      <div className="diagnostic-container">
        <Card>
          <h2>Loading diagnostic questions...</h2>
        </Card>
      </div>
    );
  }
  

  const handleAnswer = (choice) => {
    setSelected(choice);
  };

  const handleNext = async () => {
    if (selected === null) return alert("Please select an answer!");
  
    const isCorrect = selected === currentQ.answer;
    const updatedResults = [...results, isCorrect];
  
    setResults(updatedResults);
    if (isCorrect) setScore(score + 1);
  
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
    } else {
      setFinished(true);
      try {
        console.log("Saving results for user:", user?.userid);
        await saveDiagnosticResults(user?.userid, updatedResults);
        await updateDiagnosticStatus(user?.userid, true);
      } catch (err) {
        console.error("Error during diagnostic submission:", err);
      }
    }
  };
    

  const handleRestart = () => {
    navigate("/game");
  };

  if (finished)
    return (
      <div className="diagnostic-container">
        <Card>
          <h2>Diagnostic Complete!</h2>
          <p>
            Your score: {score} / {questions.length}
          </p>
          <button className="btn-primary" onClick={handleRestart}>
            Continue to Games
          </button>
        </Card>
      </div>
    );

  return (
    <div className="diagnostic-container">
      <Card>
        <h2>
          Question {current + 1} of {questions.length}
        </h2>
        <p className="question">{currentQ.question}</p>

        <div className="choices">
          {currentQ.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(choice)}
              className={`choice-btn ${selected === choice ? "selected" : ""}`}
            >
              {choice}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={handleNext}>
          {current === questions.length - 1 ? "Finish" : "Next"}
        </button>
      </Card>
    </div>
  );
}

