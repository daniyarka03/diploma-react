import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/TrainingHistory.css';

const TrainingHistory = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Load training history from localStorage
        const trainingHistory = JSON.parse(localStorage.getItem('trainingHistory') || '[]');

        // Sort by date (newest first)
        trainingHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        setHistory(trainingHistory);
    }, []);

    return (
        <div className="history-container">
            <h1 className="history-title">My Training History</h1>

            {history.length === 0 ? (
                <div className="no-history">
                    No training sessions yet. Start exercising!
                </div>
            ) : (
                <div className="history-list">
                    {history.map((session, index) => (
                        <div className="history-item" key={index}>
                            <div className="history-date">{session.formattedDate}</div>
                            <div className="history-type">{session.type}</div>
                            <div className="history-count">{session.count} reps</div>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="back-button"
                onClick={() => navigate('/')}
            >
                Back to Home
            </button>
        </div>
    );
};

export default TrainingHistory;