// Python Backend API Service
// Handles communication with the Python backend for Whisper + liblouis processing

import VideoAudioCapture from './VideoAudioCapture';

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  braille: string;
  language?: string;
  error?: string;
}

interface AudioProcessResult {
  success: boolean;
  transcript: string;
  braille: string;
  language?: string;
  segments?: any[];
  braille_table?: string;
  error?: string;
}

interface VideoProcessResult {
  success: boolean;
  subtitles: BrailleSubtitle[];
  subtitle_file: string;
  duration: number;
  chunk_count: number;
  error?: string;
}

interface BrailleSubtitle {
  id: string;
  startTime: number;
  endTime: number;
  timestamp: string;
  text: string;
  braille: string;
  method: string;
}

export class PythonBackendService {
  private baseUrl: string;
  private audioCapture: VideoAudioCapture;
  private isConnected: boolean = false;
  private audioBuffer: Float32Array[] = [];
  private processingInterval: number | null = null;
  private onTranscription: ((result: TranscriptionResult) => void) | null = null;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.audioCapture = new VideoAudioCapture();
  }

  // Translate text to braille using Python backend
  async translateToBraille(text: string, table: string = 'en-us-g1.ctb'): Promise<{
    success: boolean;
    braille: string;
    original: string;
    error?: string;
  }> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('Python backend not available');
      }

      const response = await fetch(`${this.baseUrl}/braille`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          table: table
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Braille translation failed:', error);
      return {
        success: false,
        braille: '',
        original: text,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check if Python backend is available
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = data.status === 'healthy';
        return this.isConnected;
      }
    } catch (error) {
      console.error('Python backend connection failed:', error);
      this.isConnected = false;
    }
    
    return false;
  }

  // Start capturing video audio and processing with Python backend
  async startVideoAudioCapture(
    video: HTMLVideoElement,
    onTranscription: (result: TranscriptionResult) => void
  ): Promise<void> {
    if (!await this.checkConnection()) {
      throw new Error('Python backend not available. Please start the Python server.');
    }

    this.onTranscription = onTranscription;

    // Start capturing video audio
    await this.audioCapture.startCapturing(video, (audioData: Float32Array, sampleRate: number) => {
      this.bufferAudioData(audioData, sampleRate);
    });

    // Start processing buffered audio periodically
    this.startPeriodicProcessing();
    
    console.log('Video audio capture started with Python backend');
  }

  // Stop video audio capture
  stopVideoAudioCapture(): void {
    this.audioCapture.stopCapturing();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.audioBuffer = [];
    this.onTranscription = null;
    
    console.log('Video audio capture stopped');
  }

  // Buffer audio data for processing
  private bufferAudioData(audioData: Float32Array, sampleRate: number): void {
    this.audioBuffer.push(audioData);
    
    // Keep buffer size manageable (max 10 seconds of audio)
    const maxBufferLength = Math.floor(sampleRate * 10);
    let totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    
    while (totalLength > maxBufferLength && this.audioBuffer.length > 1) {
      const removed = this.audioBuffer.shift();
      if (removed) {
        totalLength -= removed.length;
      }
    }
  }

  // Process buffered audio periodically
  private startPeriodicProcessing(): void {
    this.processingInterval = window.setInterval(async () => {
      if (this.audioBuffer.length > 0) {
        await this.processBatchedAudio();
      }
    }, 3000); // Process every 3 seconds
  }

  // Process batched audio data
  private async processBatchedAudio(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    try {
      // Combine audio buffer chunks
      const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      
      let offset = 0;
      for (const chunk of this.audioBuffer) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Clear buffer after combining
      this.audioBuffer = [];

      // Skip processing if audio is too short
      if (combinedAudio.length < 8000) { // Less than 0.5 seconds at 16kHz
        return;
      }

      // Convert to base64 WAV
      const audioBase64 = VideoAudioCapture.audioToBase64(combinedAudio, 16000);

      // Send to Python backend for processing
      const result = await this.processAudioWithBackend(audioBase64, 16000);

      if (result.success && result.transcript.trim() && this.onTranscription) {
        this.onTranscription({
          success: true,
          transcript: result.transcript,
          braille: result.braille,
          language: result.language
        });
      }

    } catch (error) {
      console.error('Audio processing error:', error);
      if (this.onTranscription) {
        this.onTranscription({
          success: false,
          transcript: '',
          braille: '',
          error: 'Processing failed'
        });
      }
    }
  }

  // Send audio to Python backend for processing
  private async processAudioWithBackend(
    audioBase64: string, 
    sampleRate: number,
    brailleTable: string = 'en-us-g1.ctb'
  ): Promise<AudioProcessResult> {
    const response = await fetch(`${this.baseUrl}/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_data: audioBase64,
        sample_rate: sampleRate,
        braille_table: brailleTable
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Check if audio capture is active
  isCapturingAudio(): boolean {
    return this.audioCapture.isCapturingAudio();
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Check backend health (alias for checkConnection)
  async checkHealth(): Promise<boolean> {
    return await this.checkConnection();
  }

  // Process audio buffer directly
  async processAudio(audioBuffer: ArrayBuffer): Promise<{
    success: boolean;
    text: string;
    braille: string;
    error?: string;
  }> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('Python backend not available');
      }

      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(audioBuffer);
      const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      const audioBase64 = btoa(binary);

      const response = await fetch(`${this.baseUrl}/process-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: audioBase64,
          sample_rate: 16000, // Default sample rate
          braille_table: 'en-us-g1.ctb'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        text: result.transcript || result.text || '',
        braille: result.braille || '',
        error: result.error
      };
      
    } catch (error) {
      console.error('Audio processing failed:', error);
      return {
        success: false,
        text: '',
        braille: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process video file to generate timestamped braille subtitles
  async processVideo(videoPath: string): Promise<VideoProcessResult> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('Python backend not available');
      }

      const response = await fetch(`${this.baseUrl}/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_path: videoPath
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        subtitles: result.subtitles || [],
        subtitle_file: result.subtitle_file || '',
        duration: result.duration || 0,
        chunk_count: result.chunk_count || 0,
        error: result.error
      };
      
    } catch (error) {
      console.error('Video processing failed:', error);
      return {
        success: false,
        subtitles: [],
        subtitle_file: '',
        duration: 0,
        chunk_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default PythonBackendService;