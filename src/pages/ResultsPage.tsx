import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './css/ResultsPage.css';

const ResultsPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Try to get count from query parameters or location state
    let count = 0;
    
    // First check URL query params
    const countParam = searchParams.get('count');
    if (countParam) {
        count = parseInt(countParam);
    } 
    // Then check if it was passed via navigation state
    else if (location.state && location.state.count) {
        count = location.state.count;
    }

    // Determine the evaluation text based on count
    const getEvaluation = () => {
        if (count >= 60) return "Excellent";
        if (count >= 45) return "Great";
        if (count >= 20) return "Good";
        return "Keep practicing";
    };

    return (
        <div className="results-container">
            <h1 className="results-title">Sitdowns</h1>

            <div className="results-count">{count}</div>
            <div className="results-evaluation">{getEvaluation()}</div>

            <button
                className="homepage-button"
                onClick={() => navigate('/')}
            >
                Go to homepage
            </button>
        </div>
    );
};

export default ResultsPage;