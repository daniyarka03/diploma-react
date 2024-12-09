import './css/ExerciseCard.css';

interface ExerciseCardProps {
    exerciseName: string;
    lastExerciseRecord: string;
    lastExerciseActivity: string;
}

const ExerciseCard = ({exerciseName, lastExerciseRecord, lastExerciseActivity}: ExerciseCardProps) => {
    return (
        <div className="exercise-card">
            <h2 className="exercise-card__title">{exerciseName}</h2>
            <span className="exercise-card__count-record">{lastExerciseRecord}</span>
            <span className="exercise-card__last-activity">{lastExerciseActivity}</span>
        </div>
    );
};

export default ExerciseCard;