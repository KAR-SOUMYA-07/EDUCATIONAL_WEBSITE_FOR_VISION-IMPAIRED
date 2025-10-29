// Audio Worklet Processor for Video Audio Capture
// Processes audio data in a separate thread for better performance

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const inputChannel = input[0]; // First channel (mono)
      
      if (inputChannel && inputChannel.length > 0) {
        // Copy audio data to avoid memory issues
        const audioData = new Float32Array(inputChannel.length);
        audioData.set(inputChannel);
        
        // Send audio data to main thread
        this.port.postMessage({
          audioData: audioData
        });
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);