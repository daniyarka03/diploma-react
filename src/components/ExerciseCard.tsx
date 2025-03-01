import './css/ExerciseCard.css';

interface ExerciseCardProps {
    exerciseName: string;
    lastExerciseRecord: string;
    lastExerciseActivity: string;
}

const ExerciseCard = ({ exerciseName, lastExerciseRecord, lastExerciseActivity }: ExerciseCardProps) => {
    let date;

    // Попробуем разобрать дату вручную
    if (lastExerciseActivity.includes(",")) {
        // Если дата в формате "01.03.2025, 17:42:00"
        const [datePart, timePart] = lastExerciseActivity.split(", ");
        const [day, month, year] = datePart.split(".").map(Number);
        date = new Date(year, month - 1, day, ...timePart.split(":").map(Number));
    } else {
        // Если дата в ISO-формате, просто создаем объект Date
        date = new Date(lastExerciseActivity);
    }

    const isValidDate = !isNaN(date.getTime());

    const formattedDate = isValidDate
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Invalid Date";

    const formattedTime = isValidDate
        ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "--:--";

    return (
        <div className="exercise-card">
            <h2 className="exercise-card__title">{exerciseName}</h2>
            <span className="exercise-card__count-record">{lastExerciseRecord}</span>
            <span className="exercise-card__last-activity">
                Last activity: {isValidDate ? `${formattedDate} (${formattedTime})` : "No data"}
            </span>
        </div>
    );
};

export default ExerciseCard;
