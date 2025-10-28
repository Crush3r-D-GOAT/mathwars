import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "../components/Card";
import "../App.css";
import "../styles/login.css";
import MathWarsLogo from "../assets/MathWarsLogin_logo.png";
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/game";
  const { login: authLogin } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter a username and password.");
      return;
    }

    try {
      const response = await login(username, password);
      console.log('Login response:', response);

      console.log('Server response:', response);
      
      if (!response.user) {
        throw new Error('No user data in server response');
      }
      
      const { id, password: _, ...userData } = response.user;
      
      if (!userData.userid && id) {
        userData.userid = id;
      }
      
      console.log('Saving user data to context:', userData);
      authLogin(userData);

      console.log("Login successful:", response);
      navigate(from, { replace: true });

    } catch (error) {
      // On failed login, display an alert
      console.error("Login failed:", error);
      alert("Login failed. Please check your username and password.");
    }
  };

  return (
    <div className="login-container">
      <Card>
        {/* Placeholder for future logo/image */}
        <div className="login-image-placeholder">
          <img src={MathWarsLogo} alt="MathWarsLogo" />
        </div>

        <h1 className="title">Login</h1>

        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="login-actions">
          <button className="btn btn-primary login-button" onClick={handleLogin}>
            Log In
          </button>
          <p className="text-center">
            Don’t have an account?{" "}
            <span className="link" onClick={() => navigate("/signup")}>
              Sign Up
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}
