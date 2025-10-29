import React, { useState, useEffect, useRef } from 'react';
import { PythonBackendService } from '../services/PythonBackendService';

interface BrailleSubtitle {
  id: string;
  timestamp: number;
  text: string;
  braille: string;
  endTime?: number;
}

interface BrailleSubtitlesProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isEnabled: boolean;
}

const BrailleSubtitles: React.FC<BrailleSubtitlesProps> = ({ videoRef, isEnabled }) => {
  const [subtitles, setSubtitles] = useState<BrailleSubtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<BrailleSubtitle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const processingRef = useRef(false);
  const pythonBackend = new PythonBackendService();

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const isReady = await pythonBackend.checkHealth();
        setBackendStatus(isReady ? 'ready' : 'unavailable');
      } catch (error) {
        console.error('Backend check failed:', error);
        setBackendStatus('unavailable');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp for display
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Process audio chunk and generate braille
  const processAudioChunk = async (audioBuffer: AudioBuffer, timestamp: number): Promise<void> => {
    if (!isEnabled || backendStatus !== 'ready' || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      console.log(`Processing audio chunk at ${formatTimestamp(timestamp)}`);
      
      // Convert AudioBuffer to WAV format
      const wavBuffer = createWavBuffer(audioBuffer);
      
      // Send to Python backend for transcription and braille conversion
      const result = await pythonBackend.processAudio(wavBuffer);
      
      if (result.text && result.text.trim()) {
        const newSubtitle: BrailleSubtitle = {
          id: `subtitle_${timestamp}_${Date.now()}`,
          timestamp,
          text: result.text.trim(),
          braille: result.braille || '⠠⠊⠝⠧⠁⠇⠊⠙ ⠃⠗⠁⠊⠇⠇⠑', // "Invalid braille" fallback
          endTime: timestamp + 3 // 3 second chunks
        };

        setSubtitles(prev => [...prev, newSubtitle]);
        console.log('Added subtitle:', newSubtitle);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Create WAV buffer from AudioBuffer
  const createWavBuffer = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

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

    // Convert audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  };

  // Capture audio from video in chunks
  useEffect(() => {
    if (!videoRef.current || !isEnabled || backendStatus !== 'ready') {
      return;
    }

    const video = videoRef.current;
    let intervalId: number;

    const startAudioCapture = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        if (!mediaSourceRef.current) {
          mediaSourceRef.current = audioContextRef.current.createMediaElementSource(video);
          
          // Create analyser node to capture audio data
          const analyserNode = audioContextRef.current.createAnalyser();
          analyserNode.fftSize = 2048;
          const bufferLength = analyserNode.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          // Connect the audio pipeline
          mediaSourceRef.current.connect(analyserNode);
          analyserNode.connect(audioContextRef.current.destination);

          // Store for audio capture
          (mediaSourceRef.current as any).analyserNode = analyserNode;
          (mediaSourceRef.current as any).dataArray = dataArray;
        }

        // Process audio every 3 seconds while video is playing
        intervalId = setInterval(async () => {
          if (video.paused || video.ended) return;

          try {
            const currentTime = video.currentTime;
            
            // Check if we already have a subtitle for this time range
            const existingSubtitle = subtitles.find(sub => 
              Math.abs(currentTime - sub.timestamp) < 2 // 2 second tolerance
            );
            
            if (existingSubtitle) return;

            // Capture 3 seconds of audio from current position
            await captureVideoAudio(currentTime);
            
          } catch (error) {
            console.error('Error in audio capture interval:', error);
          }
        }, 3000); // Every 3 seconds

      } catch (error) {
        console.error('Error setting up audio capture:', error);
      }
    };

    // Capture actual video audio
    const captureVideoAudio = async (timestamp: number): Promise<void> => {
      try {
        console.log(`Capturing video audio at ${formatTimestamp(timestamp)}`);
        
        // Create a recorder to capture the audio
        const videoEl = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
        const stream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream?.();
        
        if (!stream) {
          // Fallback: Use getUserMedia to capture system audio (requires user permission)
          console.log('Using microphone fallback for audio capture');
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          await processAudioStream(micStream, timestamp);
          return;
        }
        
        await processAudioStream(stream, timestamp);
        
      } catch (error) {
        console.error('Error capturing video audio:', error);
        // Generate a placeholder subtitle for this timestamp
        const placeholderSubtitle: BrailleSubtitle = {
          id: `placeholder_${timestamp}_${Date.now()}`,
          timestamp,
          text: '[Audio capture unavailable - use Live Braille mode]',
          braille: '⠝⠕ ⠁⠥⠙⠊⠕ ⠉⠁⠏⠞⠥⠗⠑', // "no audio capture"
          endTime: timestamp + 3
        };
        
        setSubtitles(prev => [...prev, placeholderSubtitle]);
      }
    };

    // Process audio stream and convert to braille
    const processAudioStream = async (stream: MediaStream, timestamp: number): Promise<void> => {
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          // Convert to AudioBuffer for processing
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Process with backend
          await processAudioChunk(audioBuffer, timestamp);
        } catch (error) {
          console.error('Error processing audio stream:', error);
        }
      };

      // Record for 3 seconds
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
    };

    const handlePlay = () => startAudioCapture();
    const handlePause = () => {
      if (intervalId) clearInterval(intervalId);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      if (intervalId) clearInterval(intervalId);
    };
  }, [videoRef, isEnabled, backendStatus, subtitles]);

  // Update current subtitle based on video time
  useEffect(() => {
    if (!videoRef.current || !isEnabled) {
      setCurrentSubtitle(null);
      return;
    }

    const video = videoRef.current;
    
    const updateCurrentSubtitle = () => {
      const currentTime = video.currentTime;
      const current = subtitles.find(sub => 
        currentTime >= sub.timestamp && currentTime <= (sub.endTime || sub.timestamp + 3)
      );
      setCurrentSubtitle(current || null);
    };

    const interval = setInterval(updateCurrentSubtitle, 100);
    video.addEventListener('timeupdate', updateCurrentSubtitle);

    return () => {
      clearInterval(interval);
      video.removeEventListener('timeupdate', updateCurrentSubtitle);
    };
  }, [videoRef, isEnabled, subtitles]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="braille-subtitles-container">
      <div className="braille-subtitles-header">
        <h3 className="subtitle-3">Braille Subtitles</h3>
        <div className="status-indicator">
          <div className={`status-dot ${backendStatus === 'ready' ? 'status-ready' : 
                                       backendStatus === 'checking' ? 'status-checking' : 'status-error'}`}></div>
          <span className="body-3">
            {backendStatus === 'ready' ? 'Python Backend Ready' :
             backendStatus === 'checking' ? 'Checking Backend...' : 'Python Backend Unavailable'}
          </span>
        </div>
        {isProcessing && (
          <div className="processing-indicator">
            <div className="processing-spinner"></div>
            <span className="body-3">Processing Audio...</span>
          </div>
        )}
      </div>

      <div className="current-subtitle">
        {currentSubtitle ? (
          <div className="subtitle-item current">
            <div className="subtitle-timestamp">
              {formatTimestamp(currentSubtitle.timestamp)}
            </div>
            <div className="subtitle-content">
              <div className="subtitle-text">{currentSubtitle.text}</div>
              <div className="subtitle-braille">{currentSubtitle.braille}</div>
            </div>
          </div>
        ) : (
          <div className="no-subtitle">
            <span className="body-3">No subtitle available for current time</span>
          </div>
        )}
      </div>

      <div className="subtitles-timeline">
        <h4 className="subtitle-4">Generated Subtitles</h4>
        <div className="subtitles-list">
          {subtitles.length === 0 ? (
            <div className="empty-state">
              <span className="body-3">Start playing the video to generate braille subtitles</span>
            </div>
          ) : (
            subtitles.map((subtitle) => (
              <div 
                key={subtitle.id} 
                className={`subtitle-item ${subtitle === currentSubtitle ? 'current' : ''}`}
              >
                <div className="subtitle-timestamp">
                  {formatTimestamp(subtitle.timestamp)}
                </div>
                <div className="subtitle-content">
                  <div className="subtitle-text">{subtitle.text}</div>
                  <div className="subtitle-braille">{subtitle.braille}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BrailleSubtitles;