import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import "../App.css";
import "../styles/signup.css";
import { createUser } from "../api/client";

export default function Signup() {
  const navigate = useNavigate();

  // State for form inputs
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [passwd, setPasswd] = useState("");
  const [cpasswd, setCpasswd] = useState("");
  const [error, setError] = useState("");

  // Handle sign up button click
  const handleSignup = async (e) => {
    e.preventDefault();

    // Simple frontend validation
    if (passwd !== cpasswd) {
      setError("Passwords do not match!");
      return;
    }

    if (!fname || !lname || !username || !email || !passwd) {
        setError("All fields are required.");
        return;
    }

    try {
      // Data payload for the backend
      const userData = {
        fname,
        lname,
        username,
        email,
        password: passwd,
      };

      // Call the createUser API function from client.js
      await createUser(userData);

      // On successful signup, navigate to the diagnostic page
      console.log("User successfully created!");
      navigate("/diagnostic");

    } catch (apiError) {
      // Handle API errors
      setError(apiError.message || "An error occurred during signup.");
      console.error("Signup failed:", apiError);
    }
  };

  return (
    <div className="signup-container">
      <Card>
        <div className="signup-image-placeholder">Logo</div>
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
