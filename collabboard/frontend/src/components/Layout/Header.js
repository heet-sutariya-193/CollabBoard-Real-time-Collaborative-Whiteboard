import React from "react";
import "./Header.css";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="cb-header">
      <div className="cb-row">
        <Link to="/" className="cb-brand"><h1>CollabBoard</h1></Link>

        <div className="cb-actions">
          <Link to="/auth" className="btn btn-ghost">Sign in</Link>
          <Link to="/auth" className="btn btn-primary">Start</Link>
        </div>
      </div>
    </header>
  );
}
