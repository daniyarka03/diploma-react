import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as poseDetection from '@mediapipe/pose';
import { Results, Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { useNavigate, useLocation } from 'react-router-dom';
import pointSound from '../assets/point-sound.mp3';
import levelCompleteSound from '../assets/level-complete.mp3';
import "./css/SitdownsExercise.css";
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import Stats from 'stats.js';


type LandmarkPoint = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

type SquatState = {
  phase: 'INITIAL' | 'SQUATTING' | 'BOTTOM_REACHED' | 'STANDING';
  lastPhaseChangeTime: number;
};

const SitdownsExercise = (): JSX.Element => {
    const navigate = useNavigate();
    const location = useLocation(); 
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const poseRef = useRef<Pose | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const statsFpsRef = useRef<Stats | null>(null); // Для FPS
    const statsMsRef = useRef<Stats | null>(null);  // Для ms
    const statsMbRef = useRef<Stats | null>(null);  // Для MB

    const [count, setCount] = useState<number>(0);
    const [status, setStatus] = useState<string>('Press Start to begin');
    const [isStarted, setIsStarted] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [stopwatch, setStopwatch] = useState<number>(0);
    const [isExerciseActive, setIsExerciseActive] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement>(new Audio('/point-sound.mp3'));
    const levelAudioRef = useRef<HTMLAudioElement>(new Audio('/level-complete.mp3'));
    const stopwatchRef = useRef<number | null>(null);
    const isPageVisibleRef = useRef<boolean>(true);

    const levelGoals: number[] = [20, 45, 60];
    const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
    const [levelGoal, setLevelGoal] = useState<number>(levelGoals[0]);
    const [levelsCompleted, setLevelsCompleted] = useState<boolean[]>([false, false, false]);
    const [showLevelComplete, setShowLevelComplete] = useState<boolean>(false);

    const VIDEO_CONFIG = {
        width: 360,  // уменьшили с 480
        height: 360, // сохраняем квадратный формат
        facingMode: 'user' as const
    };

    useEffect(() => {
        // Панель для FPS
        const statsFps = new Stats();
        statsFps.showPanel(0); // 0 = FPS
        statsFps.dom.style.position = 'absolute';
        statsFps.dom.style.left = '0px';
        statsFps.dom.style.top = '0px';
        document.body.appendChild(statsFps.dom);
        statsFpsRef.current = statsFps;

        // Панель для ms
        const statsMs = new Stats();
        statsMs.showPanel(1); // 1 = ms
        statsMs.dom.style.position = 'absolute';
        statsMs.dom.style.left = '80px'; // Сдвиг вправо
        statsMs.dom.style.top = '0px';
        document.body.appendChild(statsMs.dom);
        statsMsRef.current = statsMs;

        // Панель для MB
        const statsMb = new Stats();
        statsMb.showPanel(2); // 2 = MB
        statsMb.dom.style.position = 'absolute';
        statsMb.dom.style.left = '160px'; // Еще правее
        statsMb.dom.style.top = '0px';
        document.body.appendChild(statsMb.dom);
        statsMbRef.current = statsMb;

        // Очистка при размонтировании
        return () => {
            [statsFps, statsMs, statsMb].forEach(stats => {
                if (stats.dom && document.body.contains(stats.dom)) {
                    document.body.removeChild(stats.dom);
                }
            });
        };
    }, []);

    const calculateAngle = useMemo(() => (a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number => {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        const angle = Math.abs(radians * 180 / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    }, []);

    // Функция для очистки ресурсов
    const cleanup = useCallback((): void => {
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

    // Функция для остановки камеры и обработки позы
    const stopCamera = useCallback((): void => {
        if (cameraRef.current) {
            cameraRef.current.stop();
        }
        // Не закрываем Pose полностью, чтобы можно было быстро возобновить
    }, []);

    // Функция для возобновления работы камеры
    const resumeCamera = useCallback((): void => {
        if (videoRef.current && cameraRef.current && isExerciseActive && isPageVisibleRef.current) {
            cameraRef.current.start();
        }
    }, [isExerciseActive]);

    const finishExercise = useCallback((): void => {
        cleanup();
        if (count > 0) {
            const now = new Date();
            const trainingResult = {
                date: now.toISOString(),
                count: count,
                formattedDate: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
                type: 'sitdowns'
            };

            const trainingHistory = JSON.parse(localStorage.getItem('trainingHistory') || '[]');
            trainingHistory.push(trainingResult);

            localStorage.setItem('trainingHistory', JSON.stringify(trainingHistory));
        }
        window.location.href = `/results?count=${count}`;
    }, [cleanup, count]);

    const checkStandingPosition = useCallback((landmarks: LandmarkPoint[]): boolean => {
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

    // Check for level completion when count changes
    useEffect(() => {
        if (!isExerciseActive) return;

        // Check if current level is completed
        if (count >= levelGoal && currentLevelIndex < levelGoals.length && !levelsCompleted[currentLevelIndex]) {
            // Play level completion sound
            try {
                levelAudioRef.current = new Audio(levelCompleteSound);
                levelAudioRef.current.play();
            } catch (error) {
                console.error('Error playing level complete sound:', error);
            }

            // Update levels completed
            const newLevelsCompleted = [...levelsCompleted];
            newLevelsCompleted[currentLevelIndex] = true;
            setLevelsCompleted(newLevelsCompleted);

            // Show level complete message
            setShowLevelComplete(true);
            setTimeout(() => setShowLevelComplete(false), 3000);

            // If this is the max level (60 sitdowns), navigate to results
            if (currentLevelIndex === levelGoals.length - 1) {
                setTimeout(() => {
                    cleanup();
                    navigate('/results', { state: { count } });
                }, 1500);
                return;
            }

            // Move to next level if available
            if (currentLevelIndex < levelGoals.length - 1) {
                setCurrentLevelIndex(currentLevelIndex + 1);
                setLevelGoal(levelGoals[currentLevelIndex + 1]);
            }
        }
    }, [count, currentLevelIndex, isExerciseActive, levelGoal, levelGoals, levelsCompleted, cleanup, navigate]);

    const startExercise = (): void => {
        setIsStarted(true);
        setCountdown(3);

        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    clearInterval(countdownInterval);
                    setIsExerciseActive(true);
                    stopwatchRef.current = window.setInterval(() => {
                        setStopwatch(prev => prev + 1);
                    }, 1000);
                    return null;
                }
                return prev !== null ? prev - 1 : null;
            });
        }, 1000);
    };

    const formatTime = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Эффект для обработки visibility change
    useEffect(() => {
        const handleVisibilityChange = (): void => {
            if (document.hidden) {
                isPageVisibleRef.current = false;
                if (isExerciseActive) {
                    stopCamera(); // Останавливаем камеру вместо полной очистки ресурсов
                }
            } else {
                isPageVisibleRef.current = true;
                if (isExerciseActive) {
                    resumeCamera(); // Возобновляем работу камеры
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [stopCamera, resumeCamera, isExerciseActive]);

    // Эффект для отслеживания изменений URL (навигации в навбаре)
    useEffect(() => {
        return () => {
            // Выполнится при размонтировании компонента или изменении зависимостей (location)
            cleanup();
        };
    }, [location.pathname, cleanup]);

    // Эффект для обработки beforeunload
    useEffect(() => {
        const handleBeforeUnload = (): void => {
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
        
        if (!videoElement || !canvasElement) return;
        
        const canvasCtx = canvasElement.getContext('2d');
        if (!canvasCtx) return;

        canvasElement.width = VIDEO_CONFIG.width;
        canvasElement.height = VIDEO_CONFIG.height;

        const squatState: SquatState = {
            phase: 'INITIAL',
            lastPhaseChangeTime: Date.now()
        };
        const pose = new poseDetection.Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        

        pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        const CUSTOM_CONNECTIONS: [number, number][] = [
            [23, 25], // Left hip to left knee
            [25, 27], // Left knee to left ankle
            [24, 26], // Right hip to right knee
            [26, 28], // Right knee to right ankle
        ];

        const onResults = (results: Results): void => {
            statsFpsRef.current?.begin();
            statsMsRef.current?.begin();
            statsMbRef.current?.begin();

            if (!results.poseLandmarks || !isExerciseActive) {
                
            };

            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            canvasCtx.imageSmoothingEnabled = true;

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

                // Фильтруем только нужные точки (23–28)
        const squatLandmarks = landmarks.filter((_, index) =>
            [23, 24, 25, 26, 27, 28].includes(index)
        );

        drawConnectors(canvasCtx, landmarks, CUSTOM_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 3,
        });
        drawLandmarks(canvasCtx, squatLandmarks, {
            color: '#FF0000',
            lineWidth: 1.5,
            radius: 3,
        });

            const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

            const currentTime = Date.now();
            const MIN_PHASE_DURATION = 150; // Минимальная длительность фазы в мс

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
            statsFpsRef.current?.end();
            statsMsRef.current?.end();
            statsMbRef.current?.end();
        };

        pose.onResults(onResults);
        poseRef.current = pose;

        const camera = new Camera(videoElement, {
            onFrame: async (): Promise<void> => {
                await pose.send({ image: videoElement });
            },
            ...VIDEO_CONFIG
        });
        
        // Запускаем камеру только если страница видима
        if (isPageVisibleRef.current) {
            camera.start();
        }
        cameraRef.current = camera;

        return () => {
            cleanup();
        };
    }, [calculateAngle, checkStandingPosition, isExerciseActive, cleanup]);

    // Calculate progress percentage for the current level
    const calculateProgress = (): number => {
        if (currentLevelIndex === 0) {
            return Math.min(100, (count / levelGoals[0]) * 100);
        } else {
            const prevGoal = levelGoals[currentLevelIndex - 1];
            const currentGoal = levelGoals[currentLevelIndex];
            const levelProgress = Math.min(100, ((count - prevGoal) / (currentGoal - prevGoal)) * 100);
            return levelProgress;
        }
    };

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

                    {/* Level goal indicator */}
                    {isExerciseActive && (
                        <div className="level-goal">
                            <div className="goal-text">
                                Level {currentLevelIndex + 1}: {count}/{levelGoal}
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{width: `${calculateProgress()}%`}}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Level complete overlay */}
                    {showLevelComplete && (
                        <div className="level-complete-overlay">
                            Level {currentLevelIndex} Complete!
                            {currentLevelIndex < levelGoals.length - 1 ?
                                ` Next: ${levelGoals[currentLevelIndex]} squats` :
                                " All levels completed!"}
                        </div>
                    )}

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