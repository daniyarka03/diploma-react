import { useEffect, useState } from "react";
import ExerciseCard from "../components/ExerciseCard.tsx";
import { Link } from "react-router-dom";
import "./css/HomePage.css";

const HomePage = () => {
    const [listExercises, setListExercises] = useState([
        {
            lastExerciseRecord: "0",
            lastExerciseActivity: "Never",
        },
    ]);

    useEffect(() => {
        const trainingHistory = localStorage.getItem("trainingHistory");

        if (trainingHistory) {
            const parsedHistory = JSON.parse(trainingHistory);

            if (Array.isArray(parsedHistory)) {
                // Фильтруем только упражнения "sitdowns"
                const sitdownsExercises = parsedHistory.filter(
                    (exercise) => exercise.type?.toLowerCase() === "sitdowns"
                );

                if (sitdownsExercises.length > 0) {
                    // Сортируем по дате (от новейшего к старому)
                    sitdownsExercises.sort((a, b) => new Date(b.date) - new Date(a.date));

                    const latestSitdowns = sitdownsExercises[0];

                    if (latestSitdowns) {
                        setListExercises([{
                            lastExerciseRecord: latestSitdowns.count.toString(), // Используем count как число приседаний
                            lastExerciseActivity: new Date(latestSitdowns.date).toLocaleString() // Форматируем дату
                        }]);
                    }
                }
            }
        }
    }, []);

    return (
        <div>
            <div className="home-section">
                <h1 className="home__title">Trainings</h1>
                <Link key={1} to={"/menu/sitdowns"}>
                    <ExerciseCard
                        exerciseName={"Sitdowns"}
                        lastExerciseRecord={listExercises[0]?.lastExerciseRecord || "0"}
                        lastExerciseActivity={listExercises[0]?.lastExerciseActivity || "Never"}
                    />
                </Link>
            </div>
        </div>
    );
};

export default HomePage;
