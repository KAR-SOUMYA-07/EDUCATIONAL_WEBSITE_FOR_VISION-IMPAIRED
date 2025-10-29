import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceCommand } from '../types';

export const useVoiceControl = () => {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const spaceKeyDownTime = useRef<number>(0);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      setVoiceSupported(true);
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      synthRef.current.speak(utterance);
      setFeedback(text);
    }
  }, []);

  // Parse voice commands with flexible matching
  const parseCommand = useCallback((transcript: string): VoiceCommand | null => {
    const command = transcript.toLowerCase().trim();
    console.log('Parsing command:', command);
    
    // Enhanced command mapping with flexible patterns
    const commandPatterns = [
      // Play commands - flexible matching including "continue video"
      { 
        patterns: ['play', 'start', 'begin', 'resume', 'continue', 'continue video', 'pla', 'pl'], 
        fuzzyPatterns: /p[l]*a*y|start|begin|resume|continue.*video|continue/i,
        action: 'play' 
      },
      
      // Pause commands - handles "puzz", "paus", "pause"
      { 
        patterns: ['pause', 'hold', 'wait', 'paus', 'puzz', 'pau'], 
        fuzzyPatterns: /pau[sz]*e*|hold|wait|puzz/i,
        action: 'pause' 
      },
      
      // Stop commands
      { 
        patterns: ['stop', 'end', 'halt', 'sto', 'top'], 
        fuzzyPatterns: /sto*p|end|halt/i,
        action: 'stop' 
      },
      
      // Rewind/backward commands
      { 
        patterns: ['rewind', 'back', 'backward', 'go back', 'previous', 'rew'], 
        fuzzyPatterns: /re*w[i]*n*d|back|previous/i,
        action: 'rewind' 
      },
      
      // Forward/skip commands
      { 
        patterns: ['forward', 'skip', 'next', 'advance', 'fast forward', 'for'], 
        fuzzyPatterns: /for[w]*a*r*d|skip|next|advance/i,
        action: 'forward' 
      },
      
      // Restart command
      { 
        patterns: ['restart', 'reset', 'start over', 'beginning'], 
        fuzzyPatterns: /restart|reset|beginning/i,
        action: 'restart' 
      },
      
      // Volume up commands
      { 
        patterns: ['volume up', 'louder', 'increase volume', 'turn up', 'vol up'], 
        fuzzyPatterns: /vol[u]*m*e* up|loud[e]*r|increase|turn up/i,
        action: 'volumeUp' 
      },
      
      // Volume down commands
      { 
        patterns: ['volume down', 'quieter', 'decrease volume', 'turn down', 'lower', 'vol down'], 
        fuzzyPatterns: /vol[u]*m*e* down|quiet[e]*r|decrease|turn down|lower/i,
        action: 'volumeDown' 
      },
      
      // Mute commands
      { 
        patterns: ['mute', 'silence', 'quiet', 'mute audio'], 
        fuzzyPatterns: /mute|silence|quiet/i,
        action: 'mute' 
      },
      
      // Unmute commands
      { 
        patterns: ['unmute', 'sound on', 'restore sound', 'audio on'], 
        fuzzyPatterns: /unmute|sound on|audio on/i,
        action: 'unmute' 
      },
      
      // Speed up commands
      { 
        patterns: ['speed up', 'faster', 'increase speed', 'fast'], 
        fuzzyPatterns: /speed up|fast[e]*r|increase speed/i,
        action: 'speedUp' 
      },
      
      // Slow down commands
      { 
        patterns: ['slow down', 'slower', 'reduce speed', 'slow'], 
        fuzzyPatterns: /slow[e]*r*|reduce speed/i,
        action: 'slowDown' 
      },
      
      // Normal speed commands
      { 
        patterns: ['normal speed', 'regular speed', 'one x', '1x'], 
        fuzzyPatterns: /normal|regular|one x|1x/i,
        action: 'normalSpeed' 
      },
      
      // Fullscreen commands
      { 
        patterns: ['fullscreen', 'full screen', 'maximize'], 
        fuzzyPatterns: /full.*screen|maximize/i,
        action: 'fullscreen' 
      },
      
      // Timestamp navigation commands
      { 
        patterns: ['go to', 'jump to', 'navigate to', 'seek to', 'time'], 
        fuzzyPatterns: /go to|jump to|navigate to|seek to|time \d+/i,
        action: 'timestamp' 
      },
      
      // Show/Hide Braille commands
      { 
        patterns: ['show braille', 'braille on', 'enable braille', 'turn on braille', 'show brill', 'brill on', 'enable brill', 'turn on brill', 'show brail', 'brail on', 'enable brail', 'turn on brail', 'so braille', 'so brill', 'so brail', 'braille', 'brill', 'brail'], 
        fuzzyPatterns: /show.*(braille|brill|brail)|so.*(braille|brill|brail)|(?:braille|brill|brail).*on|enable.*(braille|brill|brail)|turn.*on.*(braille|brill|brail)|^(braille|brill|brail)$/i,
        action: 'showBraille' 
      },
      
      { 
        patterns: ['hide braille', 'braille off', 'disable braille', 'turn off braille', 'hide brill', 'brill off', 'disable brill', 'turn off brill', 'hide brail', 'brail off', 'disable brail', 'turn off brail'], 
        fuzzyPatterns: /hide.*(braille|brill|brail)|(?:braille|brill|brail).*off|disable.*(braille|brill|brail)|turn.*off.*(braille|brill|brail)/i,
        action: 'hideBraille' 
      },
      
      // Capture commands - handles mispronunciations
      { 
        patterns: ['capture', 'screenshot', 'snap', 'captur', 'capure', 'capature', 'capt'], 
        fuzzyPatterns: /cap[t]*[u]*r*[e]*|screenshot|snap|capture/i,
        action: 'capture' 
      },
      
      // Debug capture command
      { 
        patterns: ['debug', 'test capture', 'debug capture', 'show capture'], 
        fuzzyPatterns: /debug|test.*capture|show.*capture/i,
        action: 'debug' 
      },
      
      // Skip explanation command
      { 
        patterns: ['skip', 'skip explanation', 'stop talking', 'enough', 'next'], 
        fuzzyPatterns: /skip.*explanation|skip|stop.*talking|enough|next/i,
        action: 'skip' 
      },
      
      // Help commands
      { 
        patterns: ['help', 'commands', 'what can i say', 'instructions'], 
        fuzzyPatterns: /help|command[s]*|instructions/i,
        action: 'help' 
      }
    ];

    // Check for timestamp commands first (go to 2:30, jump to 1 minute 15 seconds, etc.)
    const timestampPatterns = [
      // "go to 2:30" or "jump to 1:45"
      /(?:go to|jump to|navigate to|seek to)\s*(\d{1,2}):(\d{2})/i,
      // "go to 2 minutes 30 seconds" or "jump to 1 minute 15 seconds"
      /(?:go to|jump to|navigate to|seek to)\s*(?:(\d+)\s*(?:minute[s]?))?\s*(?:(\d+)\s*(?:second[s]?))?/i,
      // "time 2:30" or "time 150" (seconds)
      /time\s*(?:(\d{1,2}):(\d{2})|(\d+))/i,
      // "go to minute 2" or "jump to second 30"
      /(?:go to|jump to|navigate to|seek to)\s*(?:minute\s*(\d+)|second\s*(\d+))/i
    ];

    for (const pattern of timestampPatterns) {
      const match = command.match(pattern);
      if (match) {
        let seconds = 0;
        
        if (match[1] && match[2]) {
          // MM:SS format
          seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
        } else if (match[3]) {
          // Just seconds
          seconds = parseInt(match[3]);
        } else if (match[4] && match[5]) {
          // X minutes Y seconds
          seconds = parseInt(match[4]) * 60 + parseInt(match[5]);
        } else if (match[4]) {
          // X minutes only
          seconds = parseInt(match[4]) * 60;
        } else if (match[5]) {
          // Y seconds only
          seconds = parseInt(match[5]);
        } else if (match[6]) {
          // minute X
          seconds = parseInt(match[6]) * 60;
        } else if (match[7]) {
          // second X
          seconds = parseInt(match[7]);
        }

        console.log(`Timestamp command detected: ${seconds} seconds`);
        return {
          command: command,
          action: 'timestamp',
          confidence: 0.9,
          timestamp: seconds
        };
      }
    }

    // First try exact pattern matching
    for (const group of commandPatterns) {
      for (const pattern of group.patterns) {
        if (command === pattern || command.includes(pattern)) {
          console.log(`Exact match: "${pattern}" -> action: ${group.action}`);
          return {
            command: pattern,
            action: group.action,
            confidence: command === pattern ? 1.0 : 0.9
          };
        }
      }
    }

    // Then try fuzzy pattern matching for partial/mispronounced words
    for (const group of commandPatterns) {
      if (group.fuzzyPatterns.test(command)) {
        console.log(`Fuzzy match: "${command}" -> action: ${group.action}`);
        return {
          command: command,
          action: group.action,
          confidence: 0.7
        };
      }
    }

    console.log('No command match found for:', command);
    return null;
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    console.log('Starting voice recognition...');
    setIsListening(true);
    setIsRecording(true);
    speak('Listening for command...');

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice command received:', transcript);
      const command = parseCommand(transcript);
      
      if (command) {
        console.log('Parsed command:', command);
        setLastCommand(command);
        speak(`Executing ${command.command}`);
      } else {
        console.log('Command not recognized:', transcript);
        speak(`Sorry, I didn't understand "${transcript}". Say "help" for available commands.`);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      console.error('Error details:', event);
      setIsListening(false);
      setIsRecording(false);
      
      let errorMessage = 'Voice recognition error. Please try again.';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone access denied. Please enable microphone access.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }
      
      speak(errorMessage);
    };

    recognitionRef.current.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setIsRecording(false);
    };

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setIsListening(false);
      setIsRecording(false);
      speak('Failed to start voice recognition. Please try again.');
    }
  }, [isListening, parseCommand, speak]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsRecording(false);
    }
  }, [isListening]);

  // Keyboard event handlers with enhanced spacebar prevention
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('=== KEY DOWN ===', event.code, event.key);
      if (event.code === 'Space' && !event.repeat) {
        console.log('SPACEBAR DOWN detected');
        // Completely prevent page scrolling when spacebar is pressed
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Also prevent any potential scrolling
        document.body.style.overflow = 'hidden';
        
        spaceKeyDownTime.current = Date.now();
        
        // Start listening after a short delay to ensure long press
        setTimeout(() => {
          if (spaceKeyDownTime.current && (Date.now() - spaceKeyDownTime.current >= 100)) {
            console.log('Starting voice recognition after delay');
            startListening();
          }
        }, 150);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('=== KEY UP ===', event.code, event.key);
      if (event.code === 'Space') {
        console.log('SPACEBAR UP detected');
        // Completely prevent page scrolling when spacebar is released
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Restore scrolling
        document.body.style.overflow = 'auto';
        
        const pressTime = Date.now() - spaceKeyDownTime.current;
        console.log('Spacebar press time:', pressTime);
        spaceKeyDownTime.current = 0;
        
        // If it was a long press and we're listening, stop listening
        if (pressTime >= 100 && isListening) {
          console.log('Stopping voice recognition');
          stopListening();
        }
      }
    };

    // Additional handler for keypress event (some browsers handle scrolling here)
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    console.log('Setting up keyboard event listeners');
    // Use capture phase to catch events before they bubble up
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    document.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });
    document.addEventListener('keypress', handleKeyPress, { capture: true, passive: false });

    return () => {
      console.log('Removing keyboard event listeners');
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('keypress', handleKeyPress, true);
      // Ensure overflow is restored when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, [startListening, stopListening, isListening]);

  // Provide help command
  const getHelpText = useCallback(() => {
    return `Available voice commands: 
    Video Control: Play, Continue Video, Pause, Stop, Rewind, Forward, Volume Up, Volume Down, Mute, Unmute, Fullscreen, Exit Fullscreen, Speed Up, Slow Down, Normal Speed.
    Navigation: Go to 2:30, Jump to 1 minute 15 seconds, Time 90 (go to 90 seconds), Go to minute 3.
    Braille: Show Braille/Brill/Brail, So Braille/Brill/Brail, Hide Braille/Brill/Brail, or just say Braille/Brill/Brail to show.
    AI Features: Capture (analyzes current video frame), Debug (shows captured frame).
    Interruption: Skip, Skip Explanation, Stop Talking (during AI explanations).
    Other: Help, Repeat.
    Hold the spacebar to activate voice control. During AI explanations, you can interrupt anytime with spacebar.`;
  }, []);

  return {
    isListening,
    isRecording,
    lastCommand,
    voiceSupported,
    feedback,
    speak,
    startListening,
    stopListening,
    getHelpText,
    clearCommand: () => setLastCommand(null)
  };
};

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}