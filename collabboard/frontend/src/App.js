import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from 'react-router-dom';

import LandingPage from './components/LandingPage/LandingPage';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/DashBoard';
import WhiteboardRoom from './components/Whiteboard/WhiteboardRoom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import './App.css';

// ---- Child component so useLocation can work inside Router ----
function AppContent() {
  const location = useLocation();

  // list the routes where header & footer should be HIDDEN
  const hideOnPaths = [
    "/dashboard",
    "/whiteboard",
  ];

  // check if any restricted path is part of the URL
  const shouldHideLayout = hideOnPaths.some(path =>
    location.pathname.startsWith(path)
  );

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Show header only on public pages */}
      {!shouldHideLayout && <Header />}

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/whiteboard/:roomId" element={<WhiteboardRoom />} />
        </Routes>
      </div>

      {/* Show footer only on public pages */}
      {!shouldHideLayout && <Footer />}
    </div>
  );
}

// ---- Main App wrapper ----
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
