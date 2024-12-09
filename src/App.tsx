import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import FitnessMenuPage from "./pages/FitnessMenuPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import PushUpsExercise from "./pages/PushUpsExercise.tsx";
import NewPage from './pages/NewPage.tsx';
import SitdownsExercise from "./pages/SitdownsExercise.tsx";

const App: React.FC = () => {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<FitnessMenuPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/menu/pushups" element={<PushUpsExercise />} />
              <Route path="/menu/sitdowns" element={<SitdownsExercise />} />
              <Route path="/newpage" element={<NewPage />} />
          </Routes>
      </Router>
  );
};

export default App;

