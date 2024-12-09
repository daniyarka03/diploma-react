import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as posenet from '@tensorflow-models/posenet';
import '@tensorflow/tfjs';

const GestureRecognitionApp: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [poses, setPoses] = useState<posenet.Pose[]>([]);

  const detectPose = async (net: posenet.PoseNet) => {
    if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
      const video = webcamRef.current.video;
      const pose = await net.estimateSinglePose(video, {
        flipHorizontal: false,
      });
      setPoses([pose]);
    }
  };

  useEffect(() => {
    const runPosenet = async () => {
      const net = await posenet.load();
      setInterval(() => detectPose(net), 100);  // Обновление позы каждые 100 мс
    };
    runPosenet();
  }, []);

  return (
    <div>
      <Webcam ref={webcamRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <canvas id="output" style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
};

export default GestureRecognitionApp;
