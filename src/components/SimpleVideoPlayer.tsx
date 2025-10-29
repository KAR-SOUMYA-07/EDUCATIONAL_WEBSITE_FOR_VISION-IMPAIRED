import React, { useRef, useState, useEffect } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';

interface SimpleVideoPlayerProps {
  videoSrc: string;
  title: string;
  description?: string;
}

const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({ title, description }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { lastCommand, speak, clearCommand } = useVoiceControl();

  const handlePlay = async () => {
    console.log('=== HANDLE PLAY CALLED ===');
    console.log('Current isPlaying:', isPlaying);
    console.log('Video element:', videoRef.current);
    
    if (videoRef.current) {
      try {
        if (isPlaying) {
          console.log('Pausing video...');
          videoRef.current.pause();
          setIsPlaying(false);
          speak('Video paused');
          console.log('Video paused successfully');
        } else {
          console.log('Playing video...');
          await videoRef.current.play();
          setIsPlaying(true);
          speak('Video playing');
          console.log('Video playing successfully');
        }
      } catch (error) {
        console.error('Error in handlePlay:', error);
        speak('Error controlling video');
      }
    } else {
      console.error('Video element not found!');
      speak('Video not available');
    }
  };

  const handleStop = () => {
    console.log('=== HANDLE STOP CALLED ===');
    if (videoRef.current) {
      console.log('Stopping video - pause and reset to 0');
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      speak('Video stopped');
      console.log('Video stopped successfully');
    }
  };

  const handleRewind = () => {
    console.log('=== HANDLE REWIND CALLED ===');
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      console.log('Rewinding from', videoRef.current.currentTime, 'to', newTime);
      videoRef.current.currentTime = newTime;
      speak('Rewound 10 seconds');
      console.log('Rewind completed');
    }
  };

  const handleForward = () => {
    console.log('=== HANDLE FORWARD CALLED ===');
    if (videoRef.current) {
      const newTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
      console.log('Forwarding from', videoRef.current.currentTime, 'to', newTime);
      videoRef.current.currentTime = newTime;
      speak('Forward 10 seconds');
      console.log('Forward completed');
    }
  };

  // Handle voice commands - FIXED VERSION
  useEffect(() => {
    if (!lastCommand) return;

    console.log('=== VOICE COMMAND RECEIVED ===');
    console.log('Command:', lastCommand);
    
    // Get the play button and click it automatically
    const playButton = document.querySelector('.btn-primary') as HTMLButtonElement;
    
    if (lastCommand.action === 'play' || lastCommand.action === 'pause') {
      console.log('AUTO-CLICKING PLAY/PAUSE BUTTON');
      if (playButton) {
        playButton.click();
        speak(lastCommand.action === 'play' ? 'Playing' : 'Pausing');
      }
    } else if (lastCommand.action === 'stop') {
      console.log('EXECUTING STOP - pause and reset');
      if (playButton && isPlaying) {
        playButton.click(); // Pause first
      }
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      speak('Stopped');
    } else if (lastCommand.action === 'rewind') {
      console.log('EXECUTING REWIND');
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        speak('Rewound 10 seconds');
      }
    } else if (lastCommand.action === 'forward') {
      console.log('EXECUTING FORWARD');
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
        speak('Forward 10 seconds');
      }
    }
    
    // Clear command
    clearCommand();
  }, [lastCommand, isPlaying, speak, clearCommand]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      
      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, []);

  return (
    <div className="card">
      <div className="card-padding">
        <div className="gap-4">
          <h2 className="title-4">{title}</h2>
          {description && <p className="body-2">{description}</p>}
          
          <div className="video-container">
            <video
              ref={videoRef}
              className="video-element"
              controls
              width="100%"
              height="auto"
              preload="metadata"
            >
              <source src="assets/videos/web-dev-intro.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="flex-row justify-center">
            <button
              className="btn btn-primary"
              onClick={handlePlay}
              style={{ fontSize: '18px', padding: '12px 24px' }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>

          {lastCommand && (
            <div style={{ 
              background: '#e8f5e8', 
              padding: '10px', 
              borderRadius: '5px', 
              textAlign: 'center' 
            }}>
              <p className="body-2">
                ✅ Voice command detected: <strong>{lastCommand.action}</strong>
              </p>
            </div>
          )}

          <div className="gap-2">
            <p className="body-2">
              <strong>Voice Commands:</strong> Hold spacebar and say "play", "pause", "stop", "rewind", or "forward"
            </p>
            
            <div className="flex-row justify-center flex-wrap" style={{ marginTop: '10px' }}>
              <button
                className="btn btn-ghost btn-small"
                onClick={() => {
                  console.log('=== MANUAL VOICE TEST ===');
                  console.log('Current lastCommand:', lastCommand);
                  console.log('Current isPlaying:', isPlaying);
                  speak('Manual test button clicked');
                  
                  // Manually trigger a play command
                  const testCommand = { command: 'play', action: 'play', confidence: 1.0 };
                  console.log('Setting test command:', testCommand);
                  
                  if (!isPlaying) {
                    handlePlay();
                  }
                }}
                style={{ margin: '2px' }}
              >
                🎮 Manual Play Test
              </button>
              
              <button
                className="btn btn-ghost btn-small"
                onMouseDown={() => {
                  console.log('=== SPACEBAR TEST START ===');
                  speak('Hold this button and speak a command');
                  // Simulate spacebar press
                  document.dispatchEvent(new KeyboardEvent('keydown', { 
                    code: 'Space', 
                    key: ' ',
                    repeat: false 
                  }));
                }}
                onMouseUp={() => {
                  console.log('=== SPACEBAR TEST END ===');
                  // Simulate spacebar release
                  document.dispatchEvent(new KeyboardEvent('keyup', { 
                    code: 'Space', 
                    key: ' ' 
                  }));
                }}
                style={{ margin: '2px' }}
              >
                🎤 Test Voice Recognition
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;