import React from 'react';
import '@tensorflow/tfjs';

const GestureRecognitionApp: React.FC = () => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPushupsOpen, setIsPushupsOpen] = useState(false);
    const [isSitdownsOpen, setIsSitdownsOpen] = useState(false);
    const [isPosenetOpen, setIsPosenetOpen] = useState(false);
    const [isNewExerciseWithHandsOpen, setIsNewExerciseWithHandsOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(true);
    }

    const handleProfileClick = () => {
        setIsProfileOpen(true);
    }

    const handlePushupsClick = () => {
        setIsPushupsOpen(true);
    }

    const handleSitdownsClick = () => {
        setIsSitdownsOpen(true);
    }

    const handlePosenetClick = () => {
        setIsPosenetOpen(true);
    }

    const handleNewExerciseWithHandsClick = () => {
        setIsNewExerciseWithHandsOpen(true);
    }

    return (
        <div>
            <h1>Gesture Recognition App</h1>
            <button onClick={() => window.location.href = "/"}>
                Go to Home
            </button>
                <button onClick={handleMenuClick}>
                Go to Menu
            </button>
            <button onClick={handleProfileClick}>
                Go to Profile
            </button>       
            <button onClick={handlePushupsClick}>
                Go to Pushups
            </button>                                                                                                                                           
        </div>
    );
};

export default GestureRecognitionApp;
