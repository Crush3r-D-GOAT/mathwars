import React from "react";
import "../App.css"; // Global styles
import "../styles/card.css"; // Page-specific card styles

export default function Card({ children }) {
  return <div className="card">{children}</div>;
}