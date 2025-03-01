import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { useNavigate } from 'react-router-dom';
import pointSound from '../assets/point-sound.mp3';
import levelCompleteSound from '../assets/level-complete.mp3';
import "./css/PushupsExercise.css";
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Define types for our component
type LandmarkPoint = {
    x: number;
    y: number;
    z: number;
    visibility?: number;
};

type PushupState = {
    phase: 'INITIAL' | 'GOING_DOWN' | 'BOTTOM_REACHED' | 'GOING_UP';
    lastPhaseChangeTime: number;
};

const PushupsExercise = (): JSX.Element => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const poseRef = useRef<Pose | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const pushupStateRef = useRef<PushupState>({
        phase: 'INITIAL',
        lastPhaseChangeTime: Date.now()
    });

    const [count, setCount] = useState<number>(0);
    const [status, setStatus] = useState<string>('Press Start to begin');
    const [isStarted, setIsStarted] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [stopwatch, setStopwatch] = useState<number>(0);
    const [isExerciseActive, setIsExerciseActive] = useState<boolean>(false);
    const stopwatchRef = useRef<number | null>(null);

    // Add level tracking
    const levelGoals: number[] = [10, 20, 30];
    const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
    const [levelGoal, setLevelGoal] = useState<number>(levelGoals[0]);
    const [levelsCompleted, setLevelsCompleted] = useState<boolean[]>([false, false, false]);
    const [showLevelComplete, setShowLevelComplete] = useState<boolean>(false);

    const VIDEO_CONFIG = {
        width: 360,
        height: 360,
        facingMode: 'user' as const
    };

    const calculateAngle = useMemo(() => (a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number => {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        const angle = Math.abs(radians * 180 / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    }, []);

    // Function to clean up resources
    const cleanup = useCallback((): void => {
        if (cameraRef.current) {
            try {
                cameraRef.current.stop();
            } catch (e) {
                console.error("Error stopping camera:", e);
            }
            cameraRef.current = null;
        }
        
        if (poseRef.current) {
            try {
                poseRef.current.close();
            } catch (e) {
                console.error("Error closing pose:", e);
            }
            poseRef.current = null;
        }
        
        if (stopwatchRef.current) {
            clearInterval(stopwatchRef.current);
            stopwatchRef.current = null;
        }
    }, []);

    // Function to finish exercise
    const finishExercise = useCallback((): void => {
        cleanup();
        // Save the result to localStorage
        if (count > 0) {
            const now = new Date();
            const trainingResult = {
                date: now.toISOString(),
                count: count,
                formattedDate: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
                type: 'pushups'
            };

            // Get existing training history or initialize new array
            const trainingHistory = JSON.parse(localStorage.getItem('trainingHistory') || '[]');
            trainingHistory.push(trainingResult);

            // Save updated history
            localStorage.setItem('trainingHistory', JSON.stringify(trainingHistory));
        }
        
        // Navigate to results page with the count
        window.location.href = `/results?count=${count}`;
    }, [cleanup, count]);

    // Check if user is in plank position (starting position for pushups)
    const checkPlankPosition = useCallback((landmarks: LandmarkPoint[]): boolean => {
        const [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip] =
            [11, 12, 13, 14, 15, 16, 23, 24].map(index => landmarks[index]);

        // Check if body is straight (shoulders and hips aligned)
        const isBodyStraight =
            Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2) < 0.1;

        // Check if arms are extended but not completely straight (slight bend in elbows)
        const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        const areArmsExtended = leftArmAngle > 150 && rightArmAngle > 150;

        // Check if hands are positioned under shoulders
        const areHandsUnderShoulders =
            Math.abs(leftWrist.x - leftShoulder.x) < 0.1 &&
            Math.abs(rightWrist.x - rightShoulder.x) < 0.1;

        return isBodyStraight && areArmsExtended && areHandsUnderShoulders;
    }, [calculateAngle]);

    // Check for level completion when count changes
    useEffect(() => {
        if (!isExerciseActive) return;

        // Check if current level is completed
        if (count >= levelGoal && currentLevelIndex < levelGoals.length && !levelsCompleted[currentLevelIndex]) {
            // Play level completion sound
            try {
                const sound = new Audio(levelCompleteSound);
                sound.play();
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

            // If this is the max level (30 pushups), navigate to results
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
                    setStatus('Get in plank position'); // Update status when exercise begins
                    pushupStateRef.current.phase = 'INITIAL'; // Reset phase
                    pushupStateRef.current.lastPhaseChangeTime = Date.now();
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

    // Effect for handling visibility change
    useEffect(() => {
        const handleVisibilityChange = (): void => {
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

    // Effect for handling beforeunload
    useEffect(() => {
        const handleBeforeUnload = (): void => {
            cleanup();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [cleanup]);

    // Main useEffect for setting up camera and pose detection
    useEffect(() => {
        // Don't initialize camera and pose detection until user clicks "Start"
        if (!isStarted) return;
        
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;

        if (!videoElement || !canvasElement) return;

        const canvasCtx = canvasElement.getContext('2d');
        if (!canvasCtx) return;

        canvasElement.width = VIDEO_CONFIG.width;
        canvasElement.height = VIDEO_CONFIG.height;
        
        // Only initialize if we don't already have a pose instance
        console.log('Initializing camera and pose detection');
        
        const pose = new Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        const onResults = (results: Results): void => {
            if (!results.poseLandmarks || !isExerciseActive) return;

            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.imageSmoothingEnabled = true;

            // Draw video frame
            canvasCtx.drawImage(
                results.image, 
                0, 0, 
                canvasElement.width, 
                canvasElement.height
            );

            // Draw pose landmarks
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 3,
            });
            drawLandmarks(canvasCtx, results.poseLandmarks, {
                color: '#FF0000',
                lineWidth: 1.5,
                radius: 3,
            });

            const landmarks = results.poseLandmarks;
            const [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist] =
                [11, 12, 13, 14, 15, 16].map(index => landmarks[index]);

            const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
            const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

            const currentTime = Date.now();
            const MIN_PHASE_DURATION = 500;

            // Check if user is at the bottom of the pushup
            const isBottomPosition =
                leftElbowAngle < 90 &&
                rightElbowAngle < 90;

            // Check if user is in plank/up position
            const isUpPosition = checkPlankPosition(landmarks);

            switch (pushupStateRef.current.phase) {
                case 'INITIAL':
                    if (isUpPosition) {
                        setStatus('Start going down');
                        pushupStateRef.current.phase = 'GOING_DOWN';
                        pushupStateRef.current.lastPhaseChangeTime = currentTime;
                    } else {
                        setStatus('Get in plank position');
                    }
                    break;

                case 'GOING_DOWN':
                    if (currentTime - pushupStateRef.current.lastPhaseChangeTime > MIN_PHASE_DURATION && isBottomPosition) {
                        pushupStateRef.current.phase = 'BOTTOM_REACHED';
                        pushupStateRef.current.lastPhaseChangeTime = currentTime;
                        setStatus('Push yourself up');
                    }
                    break;

                case 'BOTTOM_REACHED':
                    if (isUpPosition) {
                        pushupStateRef.current.phase = 'GOING_UP';
                        pushupStateRef.current.lastPhaseChangeTime = currentTime;
                        setStatus('Almost there');
                    }
                    break;

                case 'GOING_UP':
                    if (currentTime - pushupStateRef.current.lastPhaseChangeTime > MIN_PHASE_DURATION && isUpPosition) {
                        setCount(prev => prev + 1);
                        try {
                            const sound = new Audio(pointSound);
                            sound.play();
                        } catch (error) {
                            console.error('Error playing sound:', error);
                        }
                        setStatus('Pushup completed! Go down for the next one');
                        pushupStateRef.current.phase = 'GOING_DOWN';
                        pushupStateRef.current.lastPhaseChangeTime = currentTime;
                    }
                    break;
            }
        };

        pose.onResults(onResults);
        poseRef.current = pose;

        const camera = new Camera(videoElement, {
            onFrame: async (): Promise<void> => {
                if (poseRef.current) {
                    try {
                        await poseRef.current.send({ image: videoElement });
                    } catch (e) {
                        console.error("Error sending frame to pose:", e);
                    }
                }
            },
            ...VIDEO_CONFIG
        });
        
        try {
            camera.start();
        } catch (e) {
            console.error("Error starting camera:", e);
        }
        cameraRef.current = camera;

        return () => {
            cleanup();
        };
    }, [calculateAngle, checkPlankPosition, isExerciseActive, cleanup, isStarted]);

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
                Pushups
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
                                ` Next: ${levelGoals[currentLevelIndex]} pushups` :
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

export default PushupsExercise;