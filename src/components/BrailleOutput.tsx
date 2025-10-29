import React, { useState, useEffect, useRef } from 'react';
import BrailleTranslationService from '../services/BrailleTranslationService';
import PythonBackendService from '../services/PythonBackendService';
import VideoAudioCapture from '../services/VideoAudioCapture';

interface BrailleOutputProps {
  isVisible: boolean;
  liveText: string;
  className?: string;
}

const BrailleOutput: React.FC<BrailleOutputProps> = ({ 
  isVisible, 
  liveText,
  className = '' 
}) => {
  const [brailleLines, setBrailleLines] = useState<string[]>([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isCapturingVideo, setIsCapturingVideo] = useState(false);
  const [usePythonBackend, setUsePythonBackend] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pythonServiceRef = useRef<PythonBackendService | null>(null);
  const videoAudioCaptureRef = useRef<VideoAudioCapture | null>(null);

  // Helper function to create WAV buffer from Float32Array
  const createWavBuffer = (audioData: Float32Array, sampleRate: number): ArrayBuffer => {
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  };

  // Initialize Python backend service
  useEffect(() => {
    console.log('BrailleOutput: Initializing Python backend service...');
    pythonServiceRef.current = new PythonBackendService();
    videoAudioCaptureRef.current = new VideoAudioCapture();
    
    // Check backend connection
    const checkConnection = async () => {
      if (pythonServiceRef.current) {
        console.log('BrailleOutput: Checking Python backend connection...');
        const connected = await pythonServiceRef.current.checkConnection();
        console.log('BrailleOutput: Backend connected:', connected);
        setBackendConnected(connected);
        
        if (!connected) {
          console.warn('Python backend not available, using JavaScript fallback');
          setUsePythonBackend(false);
        }
      }
    };

    checkConnection();
  }, []);

  // Handle video audio capture when braille output is enabled
  useEffect(() => {
    if (!isVisible) {
      // Stop video capture when braille panel is hidden
      if (videoAudioCaptureRef.current) {
        videoAudioCaptureRef.current.stopCapturing();
        setIsCapturingVideo(false);
      }
      return;
    }

    // Find the video element in the page
    const videoElement = document.getElementById('mainVideo') as HTMLVideoElement;
    if (!videoElement) {
      console.log('BrailleOutput: No video element found');
      return;
    }

    const startVideoCapture = async () => {
      if (!videoAudioCaptureRef.current || !pythonServiceRef.current) return;

      try {
        setIsCapturingVideo(true);
        console.log('BrailleOutput: Starting video audio capture...');

        await videoAudioCaptureRef.current.startCapturing(
          videoElement,
          async (audioData: Float32Array, sampleRate: number) => {
            // Process audio data with Python backend
            if (pythonServiceRef.current && backendConnected) {
              try {
                // Convert Float32Array to WAV format for better compatibility
                const wavBuffer = createWavBuffer(audioData, sampleRate);
                const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(wavBuffer)));

                // Send to backend for processing
                const response = await fetch('http://localhost:5000/process-audio', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    audio_data: audioBase64,
                    sample_rate: sampleRate,
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.transcript && result.braille) {
                    console.log('BrailleOutput: Video transcript:', result.transcript);
                    console.log('BrailleOutput: Video braille:', result.braille);

                    const formattedLines = result.braille.split('\n').filter((line: string) => line.trim());
                    
                    setBrailleLines(prevLines => {
                      const newLines = [...prevLines, ...formattedLines];
                      return newLines.slice(-20); // Keep last 20 lines
                    });

                    // Auto-scroll to bottom
                    setIsScrolling(true);
                    setTimeout(() => {
                      if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                      }
                      setIsScrolling(false);
                    }, 100);
                  }
                }
              } catch (error) {
                console.error('BrailleOutput: Error processing video audio:', error);
              }
            }
          }
        );
      } catch (error) {
        console.error('BrailleOutput: Failed to start video capture:', error);
        setIsCapturingVideo(false);
      }
    };

    if (backendConnected && usePythonBackend) {
      startVideoCapture();
    }

    return () => {
      if (videoAudioCaptureRef.current) {
        videoAudioCaptureRef.current.stopCapturing();
        setIsCapturingVideo(false);
      }
    };
  }, [isVisible, backendConnected, usePythonBackend]);

  // Handle text translation with Python backend
  useEffect(() => {
    console.log('BrailleOutput: Text changed:', { isVisible, liveText: liveText.substring(0, 50) + '...' });
    
    if (!isVisible || !liveText.trim()) {
      return;
    }

    const translateText = async () => {
      if (usePythonBackend && backendConnected && pythonServiceRef.current) {
        try {
          console.log('BrailleOutput: Translating with Python backend:', liveText);
          // Use Python backend for braille translation
          const result = await pythonServiceRef.current.translateToBraille(liveText);
          console.log('BrailleOutput: Translation result:', result);
          
          if (result.success && result.braille.trim()) {
            const formattedLines = result.braille.split('\n').filter(line => line.trim());
            
            setBrailleLines(prevLines => {
              const newLines = [...prevLines, ...formattedLines];
              console.log('BrailleOutput: Updated braille lines:', newLines);
              return newLines.slice(-20); // Keep last 20 lines
            });

            // Auto-scroll to bottom
            setIsScrolling(true);
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
              setIsScrolling(false);
            }, 100);
          }
        } catch (error) {
          console.error('Failed to translate with Python backend:', error);
          // Fall back to JavaScript translation
          setUsePythonBackend(false);
        }
      }
    };

    translateText();
  }, [liveText, isVisible, usePythonBackend, backendConnected]);

  // Fallback to JavaScript implementation for regular text
  useEffect(() => {
    if (!usePythonBackend && liveText.trim()) {
      // Use JavaScript fallback
      const brailleText = BrailleTranslationService.textToBraille(liveText);
      const formattedLines = BrailleTranslationService.formatBrailleForDisplay(brailleText, 35);
      
      setBrailleLines(prevLines => {
        const newLines = [...prevLines, ...formattedLines];
        return newLines.slice(-20);
      });

      setIsScrolling(true);
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
        setIsScrolling(false);
      }, 100);
    }
  }, [liveText, usePythonBackend]);

  const handleClear = () => {
    setBrailleLines([]);
  };

  const handleToggleDemo = () => {
    const demoText = "Welcome to the Voice Learning Platform! This is a demonstration of live braille output.";
    const brailleText = BrailleTranslationService.textToBraille(demoText);
    const formattedLines = BrailleTranslationService.formatBrailleForDisplay(brailleText, 35);
    setBrailleLines(formattedLines);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`braille-output-panel ${className}`}>
      {/* Header */}
      <div className="braille-header">
        <h3 className="braille-title">
          <span className="braille-icon">⠃⠗⠇</span>
          Live Braille Output
        </h3>
        <div className="braille-controls">
          <button 
            className="btn-small btn-secondary" 
            onClick={handleToggleDemo}
            aria-label="Show braille demo"
          >
            Demo
          </button>
          <button 
            className="btn-small btn-secondary" 
            onClick={handleClear}
            aria-label="Clear braille output"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="braille-status">
        <div className={`status-dot ${
          (usePythonBackend && backendConnected && isCapturingVideo) || (!usePythonBackend && liveText) ? 'active' : 'inactive'
        }`}></div>
        <span className="status-text">
          {usePythonBackend && backendConnected ? (
            isCapturingVideo ? 'Processing Video Audio' : 'Python Backend Ready'
          ) : usePythonBackend && !backendConnected ? (
            'Python Backend Unavailable'
          ) : (
            liveText ? 'Receiving Speech' : 'Waiting for Audio'
          )}
        </span>
        {usePythonBackend && backendConnected && (
          <span className="backend-indicator">🐍 Whisper + liblouis</span>
        )}
      </div>

      {/* Braille display area */}
      <div 
        ref={containerRef}
        className={`braille-display ${isScrolling ? 'scrolling' : ''}`}
        role="log"
        aria-live="polite"
        aria-label="Live braille translation of speech"
      >
        {brailleLines.length === 0 ? (
          <div className="braille-placeholder">
            <p>⠠⠺⠁⠊⠞⠊⠝⠛ ⠋⠕⠗ ⠎⠏⠑⠑⠉⠓⠲⠲⠲</p>
            <p className="braille-placeholder-translation">
              (Waiting for speech...)
            </p>
          </div>
        ) : (
          <div className="braille-content">
            {brailleLines.map((line, index) => (
              <div 
                key={`${index}-${line.slice(0, 10)}`} 
                className="braille-line"
                aria-label={`Braille line ${index + 1}`}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="braille-footer">
        <span className="braille-info">
          Grade 1 Braille • Real-time Translation
        </span>
      </div>
    </div>
  );
};

export default BrailleOutput;