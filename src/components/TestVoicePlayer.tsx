import React, { useRef, useState, useEffect } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';

const TestVoicePlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Ready');
  const { lastCommand, speak } = useVoiceControl();

  // Direct command execution - no complex logic
  useEffect(() => {
    if (lastCommand) {
      setStatus(`Command: ${lastCommand.action}`);
      
      const video = videoRef.current;
      if (!video) return;

      // Execute immediately
      if (lastCommand.action === 'play') {
        video.play();
        setStatus('PLAYING');
      } else if (lastCommand.action === 'pause') {
        video.pause();
        setStatus('PAUSED');
      } else if (lastCommand.action === 'stop') {
        video.pause();
        video.currentTime = 0;
        setStatus('STOPPED');
      }
      
      speak(`${lastCommand.action} executed`);
    }
  }, [lastCommand, speak]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>VOICE TEST PLAYER</h1>
      
      <div style={{ 
        background: 'red', 
        color: 'white', 
        padding: '20px', 
        fontSize: '24px', 
        margin: '20px 0' 
      }}>
        STATUS: {status}
      </div>
      
      <video 
        ref={videoRef} 
        controls 
        width="400"
        style={{ display: 'block', margin: '20px auto' }}
      >
        <source src="assets/videos/web-dev-intro.mp4" type="video/mp4" />
      </video>
      
      <div style={{ fontSize: '18px', margin: '20px 0' }}>
        <p><strong>HOLD SPACEBAR AND SAY:</strong></p>
        <p>"play" - "pause" - "stop"</p>
      </div>
      
      {lastCommand && (
        <div style={{ 
          background: 'green', 
          color: 'white', 
          padding: '10px',
          fontSize: '20px'
        }}>
          LAST COMMAND: {lastCommand.action}
        </div>
      )}
    </div>
  );
};

export default TestVoicePlayer;