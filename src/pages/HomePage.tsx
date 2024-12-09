import ExerciseCard from "../components/ExerciseCard.tsx";
import {Link} from "react-router-dom";

const HomePage = () => {

    const listExercises = [
        {
            exerciseName: "Pushups",
            lastExerciseRecord: "20",
            lastExerciseActivity: "Today"
        },
        {
            exerciseName: "Situps",
            lastExerciseRecord: "30",
            lastExerciseActivity: "Yesterday"
        },
        {
            exerciseName: "Squats",
            lastExerciseRecord: "25",
            lastExerciseActivity: "Today"
        },
        {
            exerciseName: "Pullups",
            lastExerciseRecord: "10",
            lastExerciseActivity: "Yesterday"
        },
        {
            exerciseName: "Planks",
            lastExerciseRecord: "1:00",
            lastExerciseActivity: "Today"
        }
    ]

    return (
        <div>
            Home
            <div>
                {listExercises.map((exercise, index) => (
                    <Link to={"/menu/pushups"}>
                        <ExerciseCard
                            key={index}
                            exerciseName={exercise.exerciseName}
                            lastExerciseRecord={exercise.lastExerciseRecord}
                            lastExerciseActivity={exercise.lastExerciseActivity}
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HomePage;