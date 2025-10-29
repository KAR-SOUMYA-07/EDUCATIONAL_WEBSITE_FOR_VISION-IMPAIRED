import React, { useState, useEffect, useRef } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';
import { useLiveSpeechRecognition } from '../hooks/useLiveSpeechRecognition';
import { GeminiAnalysisService } from '../services/GeminiAnalysisService';
import { SimpleAnalysisService } from '../services/SimpleAnalysisService';
import { EducationalVideoContent } from '../types';
import BrailleOutput from './BrailleOutput';
import VideoSubtitles, { VideoSubtitlesRef } from './VideoSubtitles';

const VoiceLearningPlatform: React.FC = () => {
  const { 
    isListening, 
    isRecording, 
    voiceSupported, 
    feedback, 
    speak, 
    getHelpText,
    lastCommand 
  } = useVoiceControl();

  const [currentVideo] = useState({
    id: '1',
    title: 'Web Development Introduction',
    description: 'Learn the fundamentals of web development with this comprehensive introduction video. Perfect for beginners who want to understand HTML, CSS, and JavaScript basics.',
    videoUrl: './assets/videos/web-dev-intro.mp4',
    duration: 0
  });

  // Initialize Gemini service (API key from environment)
  const [geminiService] = useState(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'demo_key';
    return new GeminiAnalysisService(apiKey);
  });

  // Initialize simple analysis service as fallback
  const [simpleService] = useState(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'demo_key';
    return new SimpleAnalysisService(apiKey);
  });

  // Initialize video content for context
  const [videoContent] = useState(() => {
    return new EducationalVideoContent({
      id: currentVideo.id,
      title: currentVideo.title,
      description: currentVideo.description,
      subject: 'Web Development',
      type: 'tutorial' as const,
      topics: ['HTML', 'CSS', 'JavaScript', 'Web Development Fundamentals'],
      difficulty: 'beginner' as const
    });
  });

  // Braille output state
  const [showBrailleOutput, setShowBrailleOutput] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSubtitlesRef = useRef<VideoSubtitlesRef>(null);

  // Live speech recognition for braille output
  const { 
    startListening: startBrailleListening,
    stopListening: stopBrailleListening,
    resetTranscript: resetBrailleTranscript
  } = useLiveSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      console.log('VoiceLearningPlatform: Speech result:', { transcript, isFinal });
      if (isFinal) {
        setLiveTranscript(transcript);
        console.log('VoiceLearningPlatform: Set live transcript:', transcript);
      }
    },
    onError: (error) => {
      console.error('Braille speech recognition error:', error);
    }
  });

  // Toggle braille output
  const handleToggleBrailleOutput = () => {
    const newState = !showBrailleOutput;
    console.log('VoiceLearningPlatform: Toggling braille output:', newState);
    setShowBrailleOutput(newState);
    
    if (newState) {
      console.log('VoiceLearningPlatform: Starting braille listening...');
      startBrailleListening();
      speak('Braille output enabled. Live speech recognition started.');
    } else {
      console.log('VoiceLearningPlatform: Stopping braille listening...');
      stopBrailleListening();
      resetBrailleTranscript();
      setLiveTranscript('');
      speak('Braille output disabled.');
    }
  };

  // Enhanced speech function that allows interruption during explanation
  const speakWithInterruption = (text: string, wasPlaying: boolean, video: HTMLVideoElement) => {
    // Create a notification for the user about interruption capability
    const instructionText = `${text}. Hold spacebar anytime to interrupt or ask questions. Say "continue video" to resume playback.`;
    
    speak(instructionText);
    
    // Store video state for potential resumption
    (window as any).captureVideoState = { wasPlaying, video };
    
    // Add a brief pause instruction
    setTimeout(() => {
      if (!video.paused && wasPlaying) {
        speak('Video will remain paused. Say "play" or "continue video" when ready to resume.');
      }
    }, 2000);
  };

  // Handle capture scene command
  const handleCaptureScene = async (video: HTMLVideoElement) => {
    try {
      // Pause video immediately for better focus
      const wasPlaying = !video.paused;
      video.pause();
      
      speak('Video paused. Capturing frame for analysis...');
      
      // First try to capture the actual video frame
      console.log('Capturing video frame...');
      const screenshot = geminiService.captureVideoFrame(video);
      
      if (!screenshot) {
        console.log('Video capture failed, using text analysis fallback');
        speak('Unable to capture video frame, using context analysis...');
        
        // Fallback to text-based analysis
        const analysis = await simpleService.analyzeSceneText(videoContent, video.currentTime);
        const speechText = simpleService.formatForSpeech(analysis, videoContent);
        
        // Speak with interruption capability
        speakWithInterruption(speechText, wasPlaying, video);
        return;
      }

      console.log('Video frame captured successfully, sending to AI...');
      
      // Try vision analysis with the captured video frame
      try {
        const analysis = await geminiService.analyzeScene(
          screenshot, 
          videoContent, 
          video.currentTime
        );

        // Check if we got a real analysis or error
        if (analysis.confidence > 0) {
          const speechText = geminiService.formatForSpeech(analysis, videoContent);
          
          // Speak with interruption capability
          speakWithInterruption(speechText, wasPlaying, video);
          console.log('Vision analysis successful:', analysis);
        } else {
          throw new Error('Vision analysis failed');
        }
        
      } catch (visionError) {
        console.log('Vision API failed, falling back to text analysis:', visionError);
        speak('Vision analysis unavailable, using context analysis...');
        
        // Fallback to text analysis
        const analysis = await simpleService.analyzeSceneText(videoContent, video.currentTime);
        const speechText = simpleService.formatForSpeech(analysis, videoContent);
        
        // Speak with interruption capability
        speakWithInterruption(speechText, wasPlaying, video);
      }
      
    } catch (error) {
      console.error('Error during scene analysis:', error);
      speak('Sorry, there was an error analyzing the scene. Please try again.');
    }
  };

  // Debug function to test video frame capture
  const handleDebugCapture = (video: HTMLVideoElement) => {
    try {
      speak('Testing video frame capture...');
      console.log('Debug: Testing video capture at current time:', video.currentTime);
      
      // Show captured frame in new window for visual verification
      geminiService.showCapturedFrame(video);
      
      speak('Video frame captured. Check the new window to see what was captured.');
    } catch (error) {
      console.error('Debug capture failed:', error);
      speak('Debug capture failed. Check console for details.');
    }
  };

  // Handle skip explanation command
  const handleSkipExplanation = (video: HTMLVideoElement) => {
    try {
      // Stop any current speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      // Check if we have stored video state from capture
      const captureState = (window as any).captureVideoState;
      if (captureState && captureState.wasPlaying && captureState.video === video) {
        video.play();
        speak('Explanation skipped. Video resumed.');
        delete (window as any).captureVideoState;
      } else {
        speak('Explanation stopped.');
      }
    } catch (error) {
      console.error('Error skipping explanation:', error);
      speak('Explanation stopped.');
    }
  };

  // Welcome message - only runs once on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(`Welcome to the Voice Learning Platform. Currently loaded: ${currentVideo.title}. Hold spacebar to activate voice commands, or say "help" for available commands.`);
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle voice commands for video
  useEffect(() => {
    if (!lastCommand) return;
    
    const video = document.getElementById('mainVideo') as HTMLVideoElement;
    if (!video) return;
    
    console.log('Executing voice command:', lastCommand.action);
    
    switch (lastCommand.action) {
      case 'play':
        video.play();
        speak('Playing');
        
        // Clear any stored capture state
        if ((window as any).captureVideoState) {
          delete (window as any).captureVideoState;
        }
        break;
        
      case 'pause':
        video.pause();
        speak('Paused');
        break;
        
      case 'stop':
        video.pause();
        video.currentTime = 0;
        speak('Stopped');
        break;
        
      case 'rewind':
        video.currentTime = Math.max(0, video.currentTime - 10);
        speak('Rewound 10 seconds');
        break;
        
      case 'forward':
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        speak('Forward 10 seconds');
        break;
        
      case 'restart':
        video.currentTime = 0;
        video.play();
        speak('Restarting video');
        break;
        
      case 'volumeUp':
        video.volume = Math.min(1, video.volume + 0.1);
        speak(`Volume ${Math.round(video.volume * 100)} percent`);
        break;
        
      case 'volumeDown':
        video.volume = Math.max(0, video.volume - 0.1);
        speak(`Volume ${Math.round(video.volume * 100)} percent`);
        break;
        
      case 'mute':
        video.muted = true;
        speak('Muted');
        break;
        
      case 'unmute':
        video.muted = false;
        speak('Unmuted');
        break;
        
      case 'speedUp':
        video.playbackRate = Math.min(2, video.playbackRate + 0.25);
        speak(`Speed ${video.playbackRate} times`);
        break;
        
      case 'slowDown':
        video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
        speak(`Speed ${video.playbackRate} times`);
        break;
        
      case 'normalSpeed':
        video.playbackRate = 1;
        speak('Normal speed');
        break;
        
      case 'fullscreen':
        video.requestFullscreen?.();
        speak('Fullscreen mode');
        break;
        
      case 'capture':
        handleCaptureScene(video);
        break;

      case 'debug':
        handleDebugCapture(video);
        break;

      case 'skip':
        handleSkipExplanation(video);
        break;

      case 'timestamp':
        if (lastCommand.timestamp !== undefined) {
          const timestamp = Math.min(lastCommand.timestamp, video.duration || 0);
          video.currentTime = timestamp;
          const minutes = Math.floor(timestamp / 60);
          const seconds = Math.floor(timestamp % 60);
          speak(`Jumped to ${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          speak('No timestamp specified');
        }
        break;

      case 'showBraille':
        if (videoSubtitlesRef.current) {
          videoSubtitlesRef.current.showBraille();
          speak('Braille subtitles enabled');
        }
        break;

      case 'hideBraille':
        if (videoSubtitlesRef.current) {
          videoSubtitlesRef.current.hideBraille();
          speak('Braille subtitles disabled');
        }
        break;
        
      default:
        speak(`Command ${lastCommand.action} not recognized`);
    }
  }, [lastCommand, speak]);

  const handleHelpClick = () => {
    speak(getHelpText());
  };

  const handleWelcomeClick = () => {
    speak(`Voice Learning Platform. You are viewing: ${currentVideo.title}. Use voice commands by holding spacebar, or use the on-screen controls.`);
  };

  return (
    <div className="container">
      {/* Voice Recording Indicator */}
      {isRecording && (
        <div className="voice-indicator">
          <div className="flex-row">
            <div className="recording-dot"></div>
            🎤 Listening for commands...
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card">
        <div className="card-padding">
          <div className="gap-4">
            <div className="flex-row">
              <h1 className="title-2">🎤 Voice Learning Platform</h1>
              {!voiceSupported && (
                <span className="badge badge-error">Voice not supported</span>
              )}
              {isRecording && (
                <span className="badge badge-success">🔴 Listening...</span>
              )}
            </div>
            
            <p className="body-2">
              An accessible learning platform designed for blind users with voice control and screen reader support.
            </p>

            <div className="flex-row">
              <button 
                className="btn btn-secondary btn-small"
                onClick={handleWelcomeClick}
                aria-label="Get welcome message and current video info"
              >
                📢 Welcome
              </button>
              <button 
                className="btn btn-secondary btn-small"
                onClick={handleHelpClick}
                aria-label="Get voice command help"
              >
                ❓ Help
              </button>
              <button 
                className={`btn btn-small ${showBrailleOutput ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleToggleBrailleOutput}
                aria-label={showBrailleOutput ? 'Disable braille output' : 'Enable braille output'}
              >
                ⠃⠗⠇ {showBrailleOutput ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Status */}
      {feedback && (
        <div className="card">
          <div className="card-padding">
            <div className="badge badge-success">
              🔊 {feedback}
            </div>
          </div>
        </div>
      )}

      {/* Voice Control Status */}
      <div className="card">
        <div className="card-padding">
          <div className="gap-2">
            <div className="flex-row">
              <span className="text-bold">Voice Control Status:</span>
              {voiceSupported ? (
                <span className="badge badge-success">✅ Ready</span>
              ) : (
                <span className="badge badge-error">❌ Not Available</span>
              )}
            </div>
            
            {isListening && (
              <div className="flex-row">
                <span className="caption-1">🎙️ Listening for commands...</span>
                <div className="recording-dot"></div>
              </div>
            )}
            
            <p className="caption-1">
              Hold the <strong>spacebar</strong> to activate voice recognition. 
              Release to execute the command. Works in Chrome, Edge, and Safari.
            </p>
          </div>
        </div>
      </div>

      {/* Main Video Player */}
      <div className="card">
        <div className="card-padding">
          <div className="gap-4">
            {/* Video Header */}
            <div className="video-header">
              <h2 className="video-title">{currentVideo.title}</h2>
              <div className="video-meta">
                <span className="video-subject">Web Development</span>
                <span className="video-difficulty">Beginner</span>
                <span className="video-duration">5:26</span>
              </div>
            </div>
            
            {/* Video and Subtitles Layout */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Video Player */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                <video 
                  ref={videoRef}
                  controls 
                  width="100%" 
                  height="auto"
                  id="mainVideo"
                >
                  <source src="assets/videos/web-dev-intro.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                {/* Braille Controls */}
                <div className="braille-controls" style={{ textAlign: 'center', margin: '10px 0' }}>
                  <button
                    onClick={handleToggleBrailleOutput}
                    className={`btn ${showBrailleOutput ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {showBrailleOutput ? '🎤 Live Braille (ON)' : '🎤 Live Braille (OFF)'}
                  </button>
                </div>
              </div>

              {/* Video Braille Subtitles Panel */}
              <VideoSubtitles ref={videoSubtitlesRef} videoRef={videoRef} />
            </div>
            
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <p><strong>🎤 Hold SPACEBAR and say any of these commands:</strong></p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '10px',
                margin: '15px 0',
                fontSize: '14px'
              }}>
                <div><strong>Playback:</strong> play, pause, stop, restart</div>
                <div><strong>Navigation:</strong> rewind, forward</div>
                <div><strong>Volume:</strong> volume up, volume down, mute, unmute</div>
                <div><strong>Speed:</strong> speed up, slow down, normal speed</div>
                <div><strong>Display:</strong> fullscreen</div>
                <div><strong>Help:</strong> help, commands</div>
              </div>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Commands work with partial pronunciation: "pla" → play, "pau" → pause, "sto" → stop
              </p>
            </div>
            
            {lastCommand && (
              <div className="voice-command-display">
                <span className="command-icon">🎤</span>
                <span className="command-text">{lastCommand.action}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accessibility Features */}
      <div className="card">
        <div className="card-padding">
          <div className="gap-4">
            <h3 className="title-4">♿ Accessibility Features</h3>
            
            <div className="gap-2">
              <div className="flex-row">
                <span>🎤</span>
                <span>Voice control with spacebar activation</span>
              </div>
              <div className="flex-row">
                <span>🔊</span>
                <span>Text-to-speech feedback for all actions</span>
              </div>
              <div className="flex-row">
                <span>⌨️</span>
                <span>Full keyboard navigation support</span>
              </div>
              <div className="flex-row">
                <span>📱</span>
                <span>Screen reader compatible (ARIA labels)</span>
              </div>
              <div className="flex-row">
                <span>🎯</span>
                <span>Large, high-contrast controls</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Commands Reference */}
      <div className="card">
        <div className="card-padding">
          <div className="gap-4">
            <h3 className="title-4">🗣️ Voice Commands Reference</h3>
            
            <div className="flex-row flex-wrap">
              <div className="gap-2" style={{ minWidth: '150px' }}>
                <h4 className="text-bold caption-1">Playback:</h4>
                <p className="caption-1">• "Play"</p>
                <p className="caption-1">• "Pause"</p>
                <p className="caption-1">• "Stop"</p>
                <p className="caption-1">• "Repeat"</p>
              </div>
              
              <div className="gap-2" style={{ minWidth: '150px' }}>
                <h4 className="text-bold caption-1">Navigation:</h4>
                <p className="caption-1">• "Rewind" (10s back)</p>
                <p className="caption-1">• "Forward" (10s ahead)</p>
                <p className="caption-1">• "Go to 2:30"</p>
                <p className="caption-1">• "Jump to minute 3"</p>
                <p className="caption-1">• "Fullscreen"</p>
              </div>
              
              <div className="gap-2" style={{ minWidth: '150px' }}>
                <h4 className="text-bold caption-1">Audio:</h4>
                <p className="caption-1">• "Volume up"</p>
                <p className="caption-1">• "Volume down"</p>
                <p className="caption-1">• "Mute"</p>
                <p className="caption-1">• "Unmute"</p>
              </div>
              
              <div className="gap-2" style={{ minWidth: '150px' }}>
                <h4 className="text-bold caption-1">Speed:</h4>
                <p className="caption-1">• "Slow down"</p>
                <p className="caption-1">• "Speed up"</p>
                <p className="caption-1">• "Help"</p>
              </div>
              
              <div className="gap-2" style={{ minWidth: '150px' }}>
                <h4 className="text-bold caption-1">Braille:</h4>
                <p className="caption-1">• "Show braille"</p>
                <p className="caption-1">• "Hide braille"</p>
                <p className="caption-1">• "Braille on"</p>
                <p className="caption-1">• "Braille off"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card">
        <div className="card-padding">
          <p className="caption-1 text-center">
            Built with ❤️ for accessibility • React + Custom UI • Voice Learning Platform
          </p>
        </div>
      </div>

      {/* Braille Output Panel */}
      <BrailleOutput
        isVisible={showBrailleOutput}
        liveText={liveTranscript}
        className="braille-panel"
      />
    </div>
  );
};

export default VoiceLearningPlatform;