// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import ProfilePage from './pages/ProfilePage';
import MotionPage from './pages/MotionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PublicProfilePage from './pages/PublicProfilePage';


// Komponen Pelindung (Hanya boleh masuk kalau punya Token)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />; // Tendang balik ke Login kalau gak ada tiket
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="antialiased text-gray-200 font-sans selection:bg-pro selection:text-black">
        <Routes>
          {/* Rute Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rute Dashboard (Diproteksi) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/room/:roomId" element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          } />

          {/* Redirect default: Kalau buka /, cek login dulu */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/profile" element={
              <ProfilePage />
            } />


          <Route path="/motion/:id" element={
              <MotionPage />
            } />
          
          <Route path="/leaderboard" element={
              <LeaderboardPage />
            } />
          
          <Route path="/profile/:userId" element={
              <PublicProfilePage />
            } />

          </Routes>
      </div>
    </Router>
  );
}

export default App;