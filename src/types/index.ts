export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}

export interface BrailleSubtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  braille: string;
  method?: string;
}

export interface VoiceCommand {
  command: string;
  action: string;
  confidence: number;
  timestamp?: number;
}

export interface LearningContent {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  thumbnailUrl?: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  voiceFeedback: boolean;
  keyboardNavigation: boolean;
}

// Video content metadata for AI analysis
export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: 'educational' | 'tutorial' | 'lecture' | 'demo';
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Scene analysis result from AI
export interface SceneAnalysis {
  description: string;
  keyElements: string[];
  context: string;
  timestamp: number;
  confidence: number;
}

// Base class for video content analysis
export abstract class VideoContent {
  constructor(protected metadata: VideoMetadata) {}
  
  abstract getContextPrompt(): string;
  abstract formatAnalysisResult(analysis: SceneAnalysis): string;
  
  getMetadata(): VideoMetadata {
    return this.metadata;
  }
}

// Educational video content implementation
export class EducationalVideoContent extends VideoContent {
  getContextPrompt(): string {
    return `Educational video: "${this.metadata.title}". 
    Subject: ${this.metadata.subject}
    Topics: ${this.metadata.topics.join(', ')}
    Difficulty: ${this.metadata.difficulty}
    
    You are an educational assistant. Analyze the video frame and provide:
    - The specific programming/web development concept being shown
    - Key technical details visible in the frame
    - Why this technique matters in practical development
    
    Be concise, professional, and technical. Avoid conversational language.`;
  }
  
  formatAnalysisResult(analysis: SceneAnalysis): string {
    return `${analysis.description}`;
  }
}