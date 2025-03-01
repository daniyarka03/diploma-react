import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { useNavigate } from 'react-router-dom';
import pointSound from '../assets/point-sound.mp3';
import "./css/SitdownsExercise.css";
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const SitdownsExercise = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const cameraRef = useRef(null);

    const [count, setCount] = useState(0);
    const [status, setStatus] = useState('Press Start to begin');
    const [isStarted, setIsStarted] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [stopwatch, setStopwatch] = useState(0);
    const [isExerciseActive, setIsExerciseActive] = useState(false);
    const audioRef = useRef(new Audio('/point-sound.mp3'));
    const stopwatchRef = useRef(null);

    const VIDEO_CONFIG = {
        width: 360,  // уменьшили с 480
        height: 360, // сохраняем квадратный формат
        facingMode: 'user'
    };

    const calculateAngle = useMemo(() => (a, b, c) => {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180 / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    }, []);

    // Функция для очистки ресурсов
    const cleanup = useCallback(() => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (poseRef.current) {
            poseRef.current.close();
            poseRef.current = null;
        }
        if (stopwatchRef.current) {
            clearInterval(stopwatchRef.current);
            stopwatchRef.current = null;
        }
    }, []);

    // Функция завершения тренировки
    const finishExercise = useCallback(() => {
        cleanup();
        // Здесь можно добавить логику сохранения результатов
        window.location.replace('/');
    }, [cleanup]);

    const checkStandingPosition = useCallback((landmarks) => {
        const [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle] =
            [23, 24, 25, 26, 27, 28].map(index => landmarks[index]);

        const verticalTolerance = 0.15;
        const hipsAboveKnees = leftHip.y < leftKnee.y && rightHip.y < rightKnee.y;
        const kneesAboveAnkles = leftKnee.y < leftAnkle.y && rightKnee.y < rightAnkle.y;
        const legsAreStraight =
            Math.abs(leftHip.x - leftKnee.x) < verticalTolerance &&
            Math.abs(leftKnee.x - leftAnkle.x) < verticalTolerance &&
            Math.abs(rightHip.x - rightKnee.x) < verticalTolerance &&
            Math.abs(rightKnee.x - rightAnkle.x) < verticalTolerance;

        return hipsAboveKnees && kneesAboveAnkles && legsAreStraight;
    }, []);

    const startExercise = () => {
        setIsStarted(true);
        setCountdown(3);
        
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    setIsExerciseActive(true);
                    stopwatchRef.current = setInterval(() => {
                        setStopwatch(prev => prev + 1);
                    }, 1000);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Эффект для обработки visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isExerciseActive) {
                cleanup();
                navigate('/');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [cleanup, navigate, isExerciseActive]);

    // Эффект для обработки beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => {
            cleanup();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cleanup();
        };
    }, [cleanup]);

    useEffect(() => {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');

        if (!videoElement || !canvasElement) return;

        canvasElement.width = VIDEO_CONFIG.width;
        canvasElement.height = VIDEO_CONFIG.height;


        const squatState = {
            phase: 'INITIAL',
            lastPhaseChangeTime: Date.now()
        };

        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        const onResults = (results) => {
            if (!results.poseLandmarks || !isExerciseActive) return;

            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            canvasCtx.imageSmoothingEnabled = true;
            canvasCtx.imageSmoothingQuality = false;

            const videoWidth = results.image.width;
            const videoHeight = results.image.height;
            
            // Вычисляем размеры для сохранения пропорций
            let drawWidth = canvasElement.width;
            let drawHeight = canvasElement.height;
            const aspectRatio = videoWidth / videoHeight;
            
            if (aspectRatio > 1) {
                drawHeight = drawWidth / aspectRatio;
            } else {
                drawWidth = drawHeight * aspectRatio;
            }
            
            // Центрируем изображение
            const offsetX = (canvasElement.width - drawWidth) / 2;
            const offsetY = (canvasElement.height - drawHeight) / 2;
            
            canvasCtx.drawImage(results.image, offsetX, offsetY, canvasElement.width, canvasElement.height);

            const landmarks = results.poseLandmarks;
            const [leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle] =
                [23, 25, 27, 24, 26, 28].map(index => landmarks[index]);

            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 3,
            });
            drawLandmarks(canvasCtx, results.poseLandmarks, {
                color: '#FF0000',
                lineWidth: 1.5,
                radius: 3,
            });

            const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

            const currentTime = Date.now();
            const MIN_PHASE_DURATION = 500;

            const isFullSquat =
                leftKneeAngle < 130 &&
                rightKneeAngle < 130 &&
                leftKnee.y > leftHip.y &&
                rightKnee.y > rightHip.y &&
                leftAnkle.y > leftHip.y &&
                rightAnkle.y > rightHip.y;

            const isStanding = checkStandingPosition(landmarks);

            switch (squatState.phase) {
                case 'INITIAL':
                    if (isStanding) {
                        setStatus('Start squatting');
                    }
                    if (isFullSquat) {
                        squatState.phase = 'SQUATTING';
                        squatState.lastPhaseChangeTime = currentTime;
                        setStatus('Low point of squat');
                    }
                    break;

                case 'SQUATTING':
                    if (currentTime - squatState.lastPhaseChangeTime > MIN_PHASE_DURATION && isFullSquat) {
                        squatState.phase = 'BOTTOM_REACHED';
                        squatState.lastPhaseChangeTime = currentTime;
                    }
                    break;

                case 'BOTTOM_REACHED':
                    if (isStanding) {
                        squatState.phase = 'STANDING';
                        squatState.lastPhaseChangeTime = currentTime;
                        setStatus('Stand up completely');
                    }
                    break;

                case 'STANDING':
                    if (currentTime - squatState.lastPhaseChangeTime > MIN_PHASE_DURATION && isStanding) {
                        setCount(prev => prev + 1);
                        try {
                            audioRef.current = new Audio(pointSound);
                            audioRef.current.currentTime = 0;
                            audioRef.current.play();
                        } catch (error) {
                            console.error('Error playing sound:', error);
                        }
                        setStatus('Squat completed!');
                        squatState.phase = 'INITIAL';
                    }
                    break;
            }
        };

        pose.onResults(onResults);
        poseRef.current = pose;

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await pose.send({ image: videoElement });
            },
            ...VIDEO_CONFIG
        });
        camera.start();
        cameraRef.current = camera;

        return () => {
            cleanup();
        };
    }, [calculateAngle, checkStandingPosition, isExerciseActive, cleanup]);

    return (
        <div className="exercise-container">
            <div className="exercise-title">
                Sitdowns
            </div>

            <div className="video-container">
                <div className="video-wrapper">
                    <video
                        ref={videoRef}
                        className="video-element"
                        playsInline
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            aspectRatio: '3/4',
                            objectFit: 'cover'
                        }}
                    />
                    
                    <canvas
                        ref={canvasRef}
                        className="canvas-overlay"
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            aspectRatio: '3/4',
                            objectFit: 'cover'
                        }}
                    />

                    <div className="counter">
                        {count}
                    </div>

                    {countdown && (
                        <div className="countdown">
                            {countdown}
                        </div>
                    )}

                    {isExerciseActive && (
                        <div className="stopwatch">
                            {formatTime(stopwatch)}
                        </div>
                    )}

                    {status && (
                        <div className="status">
                            {status}
                        </div>
                    )}
                </div>
            </div>

            <div className="button-container">
                {!isStarted && (
                    <button className="start-button" onClick={startExercise}>
                        Start
                    </button>
                )}
                {isExerciseActive && (
                    <button className="finish-button" onClick={finishExercise}>
                        Finish
                    </button>
                )}
            </div>
        </div>
    );
};

export default SitdownsExercise;