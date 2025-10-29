// Video Audio Capture Service
// Captures audio from HTML video elements and sends to Python backend

export class VideoAudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaElementAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private isCapturing: boolean = false;
  private onAudioData: ((audioData: Float32Array, sampleRate: number) => void) | null = null;

  constructor() {
    // Initialize audio context when needed
  }

  async initializeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended (browser policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load audio worklet for processing
      try {
        await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      } catch (e) {
        console.warn('AudioWorklet not available, using ScriptProcessorNode fallback');
      }

    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Audio processing not supported in this browser');
    }
  }

  async startCapturing(
    video: HTMLVideoElement, 
    onAudioData: (audioData: Float32Array, sampleRate: number) => void
  ): Promise<void> {
    if (this.isCapturing) {
      this.stopCapturing();
    }

    try {
      await this.initializeAudioContext();
      
      if (!this.audioContext) {
        throw new Error('Audio context not initialized');
      }

      this.onAudioData = onAudioData;

      // Create media element source from video
      this.mediaStreamSource = this.audioContext.createMediaElementSource(video);

      // Try to use AudioWorklet first, fallback to ScriptProcessor
      if (this.audioContext.audioWorklet) {
        await this.setupAudioWorklet();
      } else {
        this.setupScriptProcessor();
      }

      // Connect to destination so video audio still plays
      this.mediaStreamSource.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('Video audio capture started');

    } catch (error) {
      console.error('Failed to start video audio capture:', error);
      throw error;
    }
  }

  private async setupAudioWorklet(): Promise<void> {
    if (!this.audioContext || !this.mediaStreamSource) return;

    try {
      this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor');
      
      this.processor.port.onmessage = (event) => {
        if (event.data.audioData && this.onAudioData) {
          this.onAudioData(event.data.audioData, this.audioContext!.sampleRate);
        }
      };

      this.mediaStreamSource.connect(this.processor);
    } catch (error) {
      console.warn('AudioWorklet setup failed, falling back to ScriptProcessor:', error);
      this.setupScriptProcessor();
    }
  }

  private setupScriptProcessor(): void {
    if (!this.audioContext || !this.mediaStreamSource) return;

    // Use ScriptProcessorNode as fallback (deprecated but widely supported)
    const bufferSize = 4096;
    const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    scriptProcessor.onaudioprocess = (event) => {
      if (this.onAudioData) {
        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(audioData), this.audioContext!.sampleRate);
      }
    };

    this.mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(this.audioContext.destination);
  }

  stopCapturing(): void {
    if (!this.isCapturing) return;

    try {
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }

      this.isCapturing = false;
      this.onAudioData = null;

      console.log('Video audio capture stopped');
    } catch (error) {
      console.error('Error stopping audio capture:', error);
    }
  }

  isCapturingAudio(): boolean {
    return this.isCapturing;
  }

  // Convert Float32Array to WAV format
  static float32ArrayToWav(audioData: Float32Array, sampleRate: number): ArrayBuffer {
    const length = audioData.length;
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

    // Convert float samples to 16-bit PCM
    const offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset + i * 2, sample * 0x7FFF, true);
    }

    return buffer;
  }

  // Convert audio to base64 for API transmission
  static audioToBase64(audioData: Float32Array, sampleRate: number): string {
    const wavBuffer = this.float32ArrayToWav(audioData, sampleRate);
    const uint8Array = new Uint8Array(wavBuffer);
    const binary = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }
}

export default VideoAudioCapture;