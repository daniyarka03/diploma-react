import { useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Тип для результатов позы, получаемых от Mediapipe
interface PoseLandmarks {
    x: number;
    y: number;
    z: number;
}

const SitdownsExercise: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [count, setCount] = useState<number>(0);

    // Флаги для отслеживания состояния приседания
    let hasStartedSquat = false; // Пользователь начал приседание
    let hasReachedPartialStand = false; // Пользователь немного встал
    let hasCompletedSquat = false; // Пользователь полностью встал

    // Буфер для сглаживания углов
    const lastAngles: number[] = [];
    const bufferAngles = (angle: number): number => {
        if (lastAngles.length >= 5) lastAngles.shift(); // Храним только последние 5 кадров
        lastAngles.push(angle);
        return lastAngles.reduce((sum, val) => sum + val, 0) / lastAngles.length; // Усреднение
    };

    useEffect(() => {
        console.log('⭐COUNT:', count);
    }, [count]);

    useEffect(() => {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        if (!canvasElement || !videoElement) return;

        const canvasCtx = canvasElement.getContext('2d');
        if (!canvasCtx) return;

        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-nocheck
        const onResults = (results: Results) => {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

            if (results.poseLandmarks) {
                // Расчет углов между суставами
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 4,
                });
                drawLandmarks(canvasCtx, results.poseLandmarks, {
                    color: '#FF0000',
                    lineWidth: 2,
                });

                const calculateAngle = (a: PoseLandmarks, b: PoseLandmarks, c: PoseLandmarks): number => {
                    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
                    const angle = Math.abs(radians * 180 / Math.PI);
                    return angle > 180 ? 360 - angle : angle;
                };

                // Получение ключевых точек
                const leftHip = results.poseLandmarks[23];
                const leftKnee = results.poseLandmarks[25];
                const leftAnkle = results.poseLandmarks[27];
                const rightHip = results.poseLandmarks[24];
                const rightKnee = results.poseLandmarks[26];
                const rightAnkle = results.poseLandmarks[28];
                // const leftShoulder = results.poseLandmarks[11];
                // const rightShoulder = results.poseLandmarks[12];
                // const leftToe = results.poseLandmarks[31];
                // const rightToe = results.poseLandmarks[32];

                // Углы для обеих ног
                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

                // Сглаживание углов
                const smoothedLeftKneeAngle = bufferAngles(leftKneeAngle);
                const smoothedRightKneeAngle = bufferAngles(rightKneeAngle);

                let isFullSquat =
                    smoothedLeftKneeAngle < 130 &&
                    smoothedRightKneeAngle < 130 &&
                    leftKnee.y > leftHip.y &&
                    rightKnee.y > rightHip.y &&
                    leftAnkle.y > leftHip.y &&
                    rightAnkle.y > rightHip.y;

                // Логика управления состояниями
                const checkStandingPosition = (landmarks: PoseLandmarks[]): boolean => {
                    // Координаты ключевых точек
                    const leftHip = landmarks[23];
                    const rightHip = landmarks[24];
                    const leftKnee = landmarks[25];
                    const rightKnee = landmarks[26];
                    const leftAnkle = landmarks[27];
                    const rightAnkle = landmarks[28];

                    // Условие 1: Бедра выше колен
                    const hipsAboveKnees =
                        leftHip.y < leftKnee.y && rightHip.y < rightKnee.y;

                    // Условие 2: Колени выше лодыжек
                    const kneesAboveAnkles =
                        leftKnee.y < leftAnkle.y && rightKnee.y < rightAnkle.y;

                    // Условие 3: Линия "бедро-колено-лодыжка" примерно вертикальна (разница по X минимальна)
                    const legsAreStraight =
                        Math.abs(leftHip.x - leftKnee.x) < 0.1 &&
                        Math.abs(leftKnee.x - leftAnkle.x) < 0.1 &&
                        Math.abs(rightHip.x - rightKnee.x) < 0.1 &&
                        Math.abs(rightKnee.x - rightAnkle.x) < 0.1;

                    return hipsAboveKnees && kneesAboveAnkles && legsAreStraight;
                };

                const handleSquatCounting = () => {
                    if (!isFullSquat && !hasStartedSquat && !hasCompletedSquat && checkStandingPosition(results.poseLandmarks)) {
                        // Пользователь встал, готов к началу приседания
                        console.log("✅ Пользователь в начальном положении.");
                        hasStartedSquat = true;
                    }

                    if (isFullSquat && hasStartedSquat && !hasCompletedSquat) {
                        // Пользователь достиг полной нижней точки приседания
                        console.log("⬇️ Приседание достигло нижней точки.");
                        hasReachedPartialStand = true;
                    }

                    if (!isFullSquat && hasStartedSquat && hasReachedPartialStand && !hasCompletedSquat && checkStandingPosition(results.poseLandmarks)) {
                        // Пользователь полностью вернулся в стоячее положение (цикл завершён)
                        setCount((prev) => prev + 1);
                        console.log("⭐ Приседание завершено! Очко добавлено.");
                        hasCompletedSquat = true;

                        // Сбрасываем флаги для нового цикла
                        hasStartedSquat = false;
                        hasReachedPartialStand = false;
                        isFullSquat = false;
                        console.log("🔄 Готов к новому циклу.");
                    }

                    if (hasCompletedSquat && checkStandingPosition(results.poseLandmarks)) {
                        // Пользователь остаётся в стоячем положении после завершённого цикла
                        console.log("🛑 В стоячем положении. Ожидание следующего приседания.");
                    }
                };

                handleSquatCounting();
            }
        };

        pose.onResults(onResults);

        if (videoElement) {
            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    await pose.send({ image: videoElement });
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }
    }, [count]);

    return (
        <div className="sitdowns">
            <h1>Sitdowns: {count}</h1>
            <video ref={videoRef} className="input_video" playsInline style={{ display: 'none' }} />
            <canvas ref={canvasRef} className="output_canvas" width="640" height="480"></canvas>
        </div>
    );
};

export default SitdownsExercise;
