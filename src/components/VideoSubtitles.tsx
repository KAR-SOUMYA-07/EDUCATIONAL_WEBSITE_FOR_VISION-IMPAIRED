import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { BrailleSubtitle } from '../types';

interface VideoSubtitlesProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export interface VideoSubtitlesRef {
  showBraille: () => void;
  hideBraille: () => void;
  toggleBraille: () => void;
  isVisible: boolean;
}

const VideoSubtitles = forwardRef<VideoSubtitlesRef, VideoSubtitlesProps>(({ videoRef }, ref) => {
  const [subtitles, setSubtitles] = useState<BrailleSubtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<BrailleSubtitle | null>(null);
  const [showBraille, setShowBraille] = useState(false);
  const [brailleMethod, setBrailleMethod] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const subtitlesContainerRef = useRef<HTMLDivElement>(null);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle braille display and load subtitles if needed
  const toggleBraille = async () => {
    if (!showBraille) {
      if (subtitles.length === 0) {
        try {
          const response = await fetch('/web-dev-intro_braille_subtitles.json');
          if (!response.ok) throw new Error('Braille file not found');
          
          const data = await response.json();
          if (data && data.subtitles && Array.isArray(data.subtitles)) {
            setSubtitles(data.subtitles);
            setBrailleMethod(data.braille_method || 'Enhanced');
          } else throw new Error('Invalid braille file format');
        } catch (error) {
          console.error('Failed to load braille subtitles:', error);
          alert('Failed to load braille subtitles.');
          return;
        }
      }
      setShowBraille(true);
    } else {
      setShowBraille(false);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showBraille: async () => {
      if (!showBraille) {
        await toggleBraille();
      }
    },
    hideBraille: () => {
      setShowBraille(false);
    },
    toggleBraille,
    isVisible: showBraille
  }), [showBraille, toggleBraille]);

  // Update current subtitle based on video time
  useEffect(() => {
    if (!showBraille || subtitles.length === 0) return;

    const updateSubtitle = () => {
      if (!videoRef.current) return;
      const currentTime = videoRef.current.currentTime;
      const subtitle = subtitles.find(
        sub => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      setCurrentSubtitle(subtitle || null);
    };

    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', updateSubtitle);
    video.addEventListener('seeked', updateSubtitle);

    return () => {
      if (video) {
        video.removeEventListener('timeupdate', updateSubtitle);
        video.removeEventListener('seeked', updateSubtitle);
      }
    };
  }, [videoRef, subtitles, showBraille]);

  // Auto-scroll to current subtitle
  useEffect(() => {
    if (!currentSubtitle || !subtitlesContainerRef.current) return;

    const currentElement = document.getElementById(`subtitle-${currentSubtitle.id}`);
    if (currentElement && subtitlesContainerRef.current) {
      currentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentSubtitle]);

  return (
    <div className="video-subtitles">
      <div className="controls">
        <button onClick={toggleBraille} className="show-braille-btn">
          {showBraille ? 'Hide Braille' : 'Show Braille'}
        </button>
        {showBraille && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="expand-btn"
            title={isExpanded ? 'Show compact view' : 'Show all subtitles'}
          >
            {isExpanded ? '📄 Compact' : '📋 Full List'}
          </button>
        )}
        {brailleMethod && <span className="method-info">Method: {brailleMethod}</span>}
      </div>

      {showBraille && (
        <div className="braille-transcription-view">
          {currentSubtitle && (
            <div className="current-subtitle-display">
              <div className="braille-card current-highlight">
                <div className="braille-text">{currentSubtitle.braille}</div>
                <div className="original-text">{currentSubtitle.text}</div>
              </div>
            </div>
          )}
          
          {isExpanded && (
            <div className="all-subtitles-container" ref={subtitlesContainerRef}>
              <h4 className="subtitles-header">All Braille Subtitles ({subtitles.length})</h4>
              <div className="subtitles-list">
                {subtitles.map((subtitle) => (
                  <div
                    key={subtitle.id}
                    id={`subtitle-${subtitle.id}`}
                    className={`subtitle-item ${
                      currentSubtitle?.id === subtitle.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = subtitle.startTime;
                      }
                    }}
                  >
                    <div className="subtitle-timestamp">
                      {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                    </div>
                    <div className="subtitle-content">
                      <div className="subtitle-braille">{subtitle.braille}</div>
                      <div className="subtitle-text">{subtitle.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

VideoSubtitles.displayName = 'VideoSubtitles';

export default VideoSubtitles;
