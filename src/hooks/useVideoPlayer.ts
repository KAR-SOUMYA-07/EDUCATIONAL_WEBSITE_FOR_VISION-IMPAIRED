import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoPlayerState } from '../types';

export const useVideoPlayer = (videoSrc: string) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
  });

  // Update video time
  const updateTime = useCallback(() => {
    if (videoRef.current && !isNaN(videoRef.current.currentTime)) {
      setState(prev => ({
        ...prev,
        currentTime: videoRef.current!.currentTime,
        duration: videoRef.current!.duration || 0,
      }));
    }
  }, []);

  // Initialize video when component mounts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('Initializing video player...');
    console.log('Video src from prop:', videoSrc);
    
    // Set up event listeners
    const handleTimeUpdate = () => updateTime();
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded, duration:', video.duration);
      updateTime();
    };
    const handleLoadedData = () => {
      console.log('Video data loaded, ready state:', video.readyState);
    };
    const handleCanPlay = () => {
      console.log('Video can start playing');
    };
    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      console.error('Video initialization error:', error);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Force initial load
    if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
      console.log('Forcing initial video load...');
      video.load();
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoSrc, updateTime]);

  // Play video with robust error handling
  const play = useCallback(async () => {
    if (!videoRef.current) {
      console.error('Video element not found');
      return;
    }

    if (state.isPlaying) {
      console.log('Video is already playing');
      return;
    }

    try {
      const video = videoRef.current;
      
      console.log('=== PLAY ATTEMPT START ===');
      console.log('Video readyState:', video.readyState);
      console.log('Video networkState:', video.networkState);
      console.log('Video currentSrc:', video.currentSrc);
      console.log('Video duration:', video.duration);
      
      // Force reload if no source is loaded
      if (!video.currentSrc || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        console.log('No video source, forcing reload...');
        video.load();
        
        // Wait for video to load
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Video load timeout'));
          }, 15000);
          
          const cleanup = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            clearTimeout(timeout);
          };
          
          const onLoadedData = () => {
            console.log('Video loaded data successfully');
            cleanup();
            resolve(void 0);
          };
          
          const onError = (e: Event) => {
            console.error('Video loading error:', (e.target as HTMLVideoElement).error);
            cleanup();
            reject(new Error('Video loading failed'));
          };
          
          video.addEventListener('loadeddata', onLoadedData);
          video.addEventListener('error', onError);
          
          // If already loaded, resolve immediately
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            cleanup();
            resolve(void 0);
          }
        });
      }
      
      // Ensure video is ready to play
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        console.log('Waiting for video to be ready...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Video ready timeout'));
          }, 10000);
          
          const cleanup = () => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            clearTimeout(timeout);
          };
          
          const onCanPlay = () => {
            console.log('Video can play');
            cleanup();
            resolve(void 0);
          };
          
          const onError = (e: Event) => {
            console.error('Video ready error:', (e.target as HTMLVideoElement).error);
            cleanup();
            reject(new Error('Video ready failed'));
          };
          
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);
        });
      }
      
      // Actually play the video
      console.log('Attempting to play video...');
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      setState(prev => ({ ...prev, isPlaying: true }));
      console.log('=== PLAY SUCCESS ===');
      
    } catch (error) {
      console.error('=== PLAY FAILED ===');
      console.error('Play error:', error);
      console.error('Video state:', {
        readyState: videoRef.current?.readyState,
        networkState: videoRef.current?.networkState,
        currentSrc: videoRef.current?.currentSrc,
        duration: videoRef.current?.duration,
        paused: videoRef.current?.paused
      });
      
      setState(prev => ({ ...prev, isPlaying: false }));
      
      // Try one more time with a complete reload
      if (videoRef.current) {
        console.log('Attempting complete video reload...');
        videoRef.current.src = '';
        videoRef.current.load();
        
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = '/assets/videos/web-dev-intro.mp4';
            videoRef.current.load();
          }
        }, 100);
      }
    }
  }, [state.isPlaying]);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current && state.isPlaying) {
      videoRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [state.isPlaying]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
      updateTime();
    }
  }, [state.duration, updateTime]);

  // Skip forward
  const skipForward = useCallback((seconds: number = 10) => {
    if (videoRef.current) {
      const newTime = Math.min(videoRef.current.currentTime + seconds, state.duration);
      seekTo(newTime);
    }
  }, [state.duration, seekTo]);

  // Skip backward
  const skipBackward = useCallback((seconds: number = 10) => {
    if (videoRef.current) {
      const newTime = Math.max(videoRef.current.currentTime - seconds, 0);
      seekTo(newTime);
    }
  }, [seekTo]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      videoRef.current.volume = clampedVolume;
      setState(prev => ({ ...prev, volume: clampedVolume, isMuted: clampedVolume === 0 }));
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMutedState = !state.isMuted;
      videoRef.current.muted = newMutedState;
      setState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [state.isMuted]);

  // Set playback speed
  const setPlaybackSpeed = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = Math.max(0.25, Math.min(3, speed));
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen?.();
      setState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen?.();
      setState(prev => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Format time display
  const formatTime = useCallback((time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Set up video event listeners and keyboard controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => updateTime();
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded, duration:', video.duration);
      setState(prev => ({ ...prev, duration: video.duration }));
    };
    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };
    const handleLoadStart = () => {
      console.log('Video loading started for:', videoSrc);
    };
    const handleCanPlay = () => {
      console.log('Video can play');
    };
    const handleError = (e: Event) => {
      console.error('Video error:', (e.target as HTMLVideoElement).error);
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          if (!e.repeat) {
            e.preventDefault();
            togglePlayPause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward(10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward(10);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    // Load video
    video.load();

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [updateTime, togglePlayPause, skipBackward, skipForward, toggleMute, toggleFullscreen, videoSrc]);

  return {
    videoRef,
    state,
    controls: {
      play,
      pause,
      togglePlayPause,
      seekTo,
      skipForward,
      skipBackward,
      setVolume,
      toggleMute,
      setPlaybackSpeed,
      toggleFullscreen,
      formatTime,
    },
  };
};