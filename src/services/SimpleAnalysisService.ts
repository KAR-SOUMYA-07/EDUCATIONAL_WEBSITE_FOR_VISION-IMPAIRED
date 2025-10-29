import { SceneAnalysis, VideoContent } from '../types';

export class SimpleAnalysisService {
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

      // Draw the current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to base64 image
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }

  /**
   * Simple text-based analysis (fallback when vision API fails)
   */
  async analyzeSceneText(
    videoContent: VideoContent, 
    currentTime: number
  ): Promise<SceneAnalysis> {
    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `You are helping a student understand educational video content in a friendly, conversational way. 
                
Video Information:
- Title: ${videoContent.getMetadata().title}
- Subject: ${videoContent.getMetadata().subject}
- Current timestamp: ${Math.floor(currentTime)}s
- Topics: ${videoContent.getMetadata().topics.join(', ')}

Based on this video information and timestamp, provide a warm, educational explanation of what concept is likely being covered at this point. 

Speak like a helpful tutor would, using phrases like:
- "At this point in the lesson, we're probably looking at..."
- "This part of the video typically covers..."
- "You'd likely see an example of..."

Focus on teaching the concept rather than just listing what might be visible. Help the student understand why this topic matters and how it fits into their learning journey.

Keep it conversational, encouraging, and educational.`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.3
        }
      };

      console.log('Making text-based analysis request...');

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Text API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Text API Error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

      return {
        description: analysisText,
        keyElements: ['Text-based analysis', 'Educational content'],
        context: videoContent.getMetadata().subject,
        timestamp: currentTime,
        confidence: 0.7
      };

    } catch (error) {
      console.error('Text analysis failed:', error);
      
      return {
        description: `Based on the video "${videoContent.getMetadata().title}" at ${Math.floor(currentTime)} seconds, this appears to be educational content about ${videoContent.getMetadata().subject}. Common elements might include demonstrations, examples, or explanations relevant to ${videoContent.getMetadata().topics.join(' and ')}.`,
        keyElements: ['Fallback analysis'],
        context: videoContent.getMetadata().subject,
        timestamp: currentTime,
        confidence: 0.5
      };
    }
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