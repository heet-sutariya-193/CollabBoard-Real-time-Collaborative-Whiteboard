import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/DashBoard';
import WhiteboardRoom from './components/Whiteboard/WhiteboardRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/whiteboard/:roomId" element={<WhiteboardRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;