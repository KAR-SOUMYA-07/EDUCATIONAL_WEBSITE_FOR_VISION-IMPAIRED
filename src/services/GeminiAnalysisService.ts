import { SceneAnalysis, VideoContent } from '../types';

export class GeminiAnalysisService {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Captures a screenshot from the video element
   */
  captureVideoFrame(videoElement: HTMLVideoElement): string | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      // Set canvas dimensions to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      console.log(`Capturing video frame: ${canvas.width}x${canvas.height}px`);

      // Draw the current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to base64 image
      const dataURL = canvas.toDataURL('image/png');
      
      // Debug: log the first part of the data URL to verify it's a real image
      console.log('Video frame captured, data URL length:', dataURL.length);
      console.log('Data URL preview:', dataURL.substring(0, 100) + '...');

      return dataURL;
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }

  /**
   * Debug function to show captured frame (for testing)
   */
  showCapturedFrame(videoElement: HTMLVideoElement): void {
    const dataURL = this.captureVideoFrame(videoElement);
    if (dataURL) {
      // Create a new window to show the captured frame
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Captured Video Frame</title></head>
            <body>
              <h2>Captured Video Frame (${videoElement.videoWidth}x${videoElement.videoHeight}px)</h2>
              <img src="${dataURL}" alt="Captured frame" style="max-width:100%;height:auto;"/>
              <p>This is what will be sent to the AI for analysis.</p>
            </body>
          </html>
        `);
      }
    } else {
      console.error('Could not capture video frame for preview');
    }
  }

  /**
   * Analyzes a video frame using Gemini Vision API
   */
  async analyzeScene(
    imageBase64: string, 
    videoContent: VideoContent, 
    currentTime: number
  ): Promise<SceneAnalysis> {
    try {
      console.log('Starting scene analysis...', { currentTime, hasImage: !!imageBase64 });
      
      // Remove data:image/png;base64, prefix
      const base64Data = imageBase64.split(',')[1];
      
      if (!base64Data) {
        throw new Error('Invalid image format');
      }

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: videoContent.getContextPrompt() + 
                  `\n\nCurrent timestamp: ${Math.floor(currentTime)}s. 
                  
                  Analyze this frame concisely and professionally. Avoid greetings and conversational filler.
                  
                  Provide:
                  - Specific concept/technique being demonstrated
                  - Key technical details visible
                  - Practical application in ${videoContent.getMetadata().subject}
                  
                  Keep response under 80 words. Be direct and educational.`
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.1
        }
      };

      console.log('Making API request to:', `${this.baseUrl}?key=${this.apiKey.substring(0, 10)}...`);

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

      // Parse the response and extract key elements
      const keyElements = this.extractKeyElements(analysisText);

      const result = {
        description: analysisText,
        keyElements,
        context: videoContent.getMetadata().subject,
        timestamp: currentTime,
        confidence: 0.85 // Default confidence
      };

      console.log('Scene analysis complete:', result);
      return result;

    } catch (error) {
      console.error('Error analyzing scene with Gemini:', error);
      
      // Return fallback analysis with more specific error info
      return {
        description: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and try again.`,
        keyElements: ['Analysis error'],
        context: 'Error occurred',
        timestamp: currentTime,
        confidence: 0
      };
    }
  }

  /**
   * Extracts key elements from the analysis text
   */
  private extractKeyElements(text: string): string[] {
    const elements: string[] = [];
    
    // Look for common educational elements
    const patterns = [
      /code|programming|function|variable|class/gi,
      /diagram|chart|graph|illustration/gi,
      /text|title|heading|label/gi,
      /person|instructor|teacher|presenter/gi,
      /screen|display|interface|window/gi,
      /button|menu|toolbar|panel/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        elements.push(...matches.slice(0, 2)); // Limit to 2 matches per pattern
      }
    });

    return [...new Set(elements)]; // Remove duplicates
  }

  /**
   * Formats the analysis for audio output
   */
  formatForSpeech(analysis: SceneAnalysis, videoContent: VideoContent): string {
    const formatted = videoContent.formatAnalysisResult(analysis);
    
    // Clean up for speech synthesis
    return formatted
      .replace(/[^\w\s.,!?]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}