import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import FitnessMenuPage from "./pages/FitnessMenuPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import PushUpsExercise from "./pages/PushUpsExercise.tsx";
import SitdownsExercise from "./pages/SitdownsExercise.tsx";
import ResultsPage from "./pages/ResultsPage.tsx";
import TrainingHistory from "./pages/TrainingHistory.tsx";
import Navbar from "./components/Navbar.tsx";

const App: React.FC = () => {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<FitnessMenuPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/menu/pushups" element={<PushUpsExercise />} />
              <Route path="/menu/sitdowns" element={<SitdownsExercise />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/history" element={<TrainingHistory />} />
          </Routes>
          <Navbar />
      </Router>
  );
};

export default App;

