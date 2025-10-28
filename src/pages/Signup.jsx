import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import "../App.css";
import "../styles/signup.css";
import { createUser } from "../api/client";

import MathWarsLogo from "../assets/MathWarsLogin_logo.png";

export default function Signup() {
  const navigate = useNavigate();

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [passwd, setPasswd] = useState("");
  const [cpasswd, setCpasswd] = useState("");
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    if (passwd !== cpasswd) {
      setError("Passwords do not match!");
      return;
    }

    if (!fname || !lname || !username || !email || !passwd) {
        setError("All fields are required.");
        return;
    }

    try {
      const userData = {
        fname,
        lname,
        username,
        email,
        password: passwd,
        isdiagnostic: false,
      };

      await createUser(userData);

      console.log("User successfully created!");
      navigate("/game");

    } catch (apiError) {
      setError(apiError.message || "An error occurred during signup.");
      console.error("Signup failed:", apiError);
    }
  };

  return (
    <div className="signup-container">
      <Card>
        <div className="signup-image-placeholder">
          <img src={MathWarsLogo} alt="MathWarsLogo" />
        </div>
        <h1 className="title">Sign Up</h1>

        <form onSubmit={handleSignup}>
          <input
            className="input"
            type="text"
            placeholder="First Name"
            value={fname}
            onChange={(e) => setFname(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Last Name"
            value={lname}
            onChange={(e) => setLname(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={passwd}
            onChange={(e) => setPasswd(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm Password"
            value={cpasswd}
            onChange={(e) => setCpasswd(e.target.value)}
          />
          <button className="btn-primary" type="submit">
            Sign Up
          </button>
        </form>

        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        <p className="text-center">
            Already have an account?{" "}
            <span className="link" onClick={() => navigate("/login")}>
                Log in
            </span>
        </p>
     </Card>
    </div>
  );
}
