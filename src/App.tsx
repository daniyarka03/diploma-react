import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import FitnessMenuPage from "./pages/FitnessMenuPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import PushUpsExercise from "./pages/PushUpsExercise.tsx";
import SitdownsExercise from "./pages/SitdownsExercise.tsx";
import NewExerciseWithHands from "./pages/NewExerciseWithHands.tsx";

const App: React.FC = () => {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<FitnessMenuPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/menu/pushups" element={<PushUpsExercise />} />
              <Route path="/menu/sitdowns" element={<SitdownsExercise />} />
              <Route path="/menu/sitdowns2" element={<PosenetExample />} />
              <Route path="/newpage" element={<NewExerciseWithHands />} />
          </Routes>
      </Router>
  );
};

export default App;

