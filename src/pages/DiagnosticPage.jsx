import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import "../App.css";
import "../styles/diagnostic.css";

export default function DiagnosticPage() {
  const navigate = useNavigate();

  const handleStartTest = () => {
    // TODO: Add logic to start diagnostic test
    console.log("Diagnostic test started");
    navigate("/game"); // Example: send user to game hub after test
  };

  return (
    <div className="diagnostic-container">
      <Card>
        <h1 className="title">Diagnostic Test</h1>
        <p className="subtitle">
          This quick test will help us tailor your experience.
        </p>

        <button className="btn-primary" onClick={handleStartTest}>
          Start Test
        </button>
      </Card>
    </div>
  );
}
