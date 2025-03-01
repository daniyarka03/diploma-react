import React, { useRef, useEffect, useState, useCallback } from "react";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import pointSound from '../assets/point-sound.mp3';

const NewExerciseWithHands: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const poseRef = useRef<Pose | null>(null);
    const audioRef = pointSound;

    const [score, setScore] = useState(0);
    const [exerciseState, setExerciseState] = useState<'down' | 'up' | 'complete'>('down');

    // Состояние для плавности переходов
    const stateTrackerRef = useRef({
        stabilityThreshold: 5, // Увеличиваем порог стабильности
        handUpHistory: [] as boolean[],
        handDownHistory: [] as boolean[],
        lastStateChangeTime: 0 // Добавляем отслеживание времени между состояниями
    });



    const SHOULDER_THRESHOLD = 0.2; // Относительный порог для поднятия рук

    const isHandStable = useCallback((history: boolean[], stableValue: boolean) => {
        // Увеличиваем количество кадров для более стабильного определения состояния
        return history.length > 5 && history.filter(val => val === stableValue).length >= 4;
    }, []);
    useEffect(() => {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement?.getContext("2d");

        if (!videoElement || !canvasElement || !canvasCtx) return;

        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.7, // Немного повышаем
            minTrackingConfidence: 0.7  // Немного повышаем
        });

        pose.onResults((results) => {
            if (!results.poseLandmarks) return;

            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

            const landmarks = results.poseLandmarks;
            const tracker = stateTrackerRef.current;
            const currentTime = Date.now();
            if (currentTime - tracker.lastStateChangeTime < 500) return;
            // Получаем координаты в относительных единицах
            const leftWristY = landmarks[POSE_LANDMARKS.LEFT_WRIST].y;
            const rightWristY = landmarks[POSE_LANDMARKS.RIGHT_WRIST].y;
            const leftShoulderY = landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y;
            const rightShoulderY = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].y;

            // Проверка поднятия рук с использованием относительных координат
            const leftHandUp = leftWristY < leftShoulderY - SHOULDER_THRESHOLD;
            const rightHandUp = rightWristY < rightShoulderY - SHOULDER_THRESHOLD;
            const bothHandsUp = leftHandUp && rightHandUp;

            const leftHandDown = leftWristY > leftShoulderY + SHOULDER_THRESHOLD;
            const rightHandDown = rightWristY > rightShoulderY + SHOULDER_THRESHOLD;
            const bothHandsDown = leftHandDown && rightHandDown;

            // Обновляем историю состояний рук
            tracker.handUpHistory.push(bothHandsUp);
            tracker.handDownHistory.push(bothHandsDown);

            // Обрезаем историю до последних 5 состояний
            if (tracker.handUpHistory.length > 5) tracker.handUpHistory.shift();
            if (tracker.handDownHistory.length > 5) tracker.handDownHistory.shift();

            // Логика состояний с более плавным переходом
            switch (exerciseState) {
                case "down":
                    if (isHandStable(tracker.handUpHistory, true)) {
                        setExerciseState("up");
                        tracker.lastStateChangeTime = currentTime;
                        tracker.handUpHistory = [];
                        tracker.handDownHistory = [];
                    }
                    break;

                case "up":
                    if (isHandStable(tracker.handDownHistory, true)) {
                        setExerciseState("complete");
                        tracker.lastStateChangeTime = currentTime;
                        tracker.handUpHistory = [];
                        tracker.handDownHistory = [];
                    }
                    break;

                case "complete":
                    setScore(prev => prev + 1);

                    // Воспроизведение звука
                    try {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play();
                    } catch (error) {
                        console.error('Ошибка воспроизведения звука:', error);
                    }

                    setExerciseState("down");
                    break;
            }

            // Отладочная визуализация точек
            landmarks.forEach((landmark) => {
                canvasCtx.beginPath();
                canvasCtx.arc(
                    landmark.x * canvasElement.width,
                    landmark.y * canvasElement.height,
                    3,
                    0,
                    2 * Math.PI
                );
                canvasCtx.fillStyle = "red";
                canvasCtx.fill();
            });
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await pose.send({ image: videoElement });
            },
            width: 640,
            height: 480,
        });

        camera.start();
        poseRef.current = pose;

        return () => {
            camera.stop();
            pose.close();
        };
    }, [exerciseState, isHandStable]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '480px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#f0f0f0'
        }}>
            <h1 style={{
                fontSize: "36px",
                color: "blue",
                fontWeight: "bold",
                marginBottom: '20px'
            }}>
                Упражнение: {score}
            </h1>
            <p style={{
                fontSize: '18px',
                marginBottom: '20px',
                textAlign: 'center'
            }}>
                Состояние: {exerciseState}
            </p>
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '480px',
                aspectRatio: '16/9'
            }}>
                <video ref={videoRef} style={{ display: "none" }} />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{
                        width: '100%',
                        height: 'auto',
                        border: '1px solid black'
                    }}
                />
            </div>
        </div>
    );
};

export default NewExerciseWithHands;