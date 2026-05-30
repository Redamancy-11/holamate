import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Planner from './pages/Planner';
import MapExplore from './pages/MapExplore';
import OrderFood from './pages/OrderFood';
import SellerDashboard from './pages/SellerDashboard';
import StudentStoreDashboard from './pages/StudentStoreDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SocialAuthCallback from './pages/SocialAuthCallback';
import ResetPassword from './pages/ResetPassword';
import AuthModal from './components/AuthModal';
import PageReviewBox from './components/PageReviewBox';
import { AuthProvider } from './contexts/AuthContext';
import './assets/styles.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <AuthModal />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/map" element={<MapExplore />} />
          <Route path="/order" element={<OrderFood />} />
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/student-store" element={<StudentStoreDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<SocialAuthCallback />} />
        </Routes>
        <PageReviewBox />
      </Router>
    </AuthProvider>
  );
}

export default App;
