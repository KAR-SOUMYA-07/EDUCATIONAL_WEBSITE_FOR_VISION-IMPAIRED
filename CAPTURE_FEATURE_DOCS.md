# AI-Powered Scene Capture Feature

## Overview
The voice learning platform now includes an advanced AI-powered scene analysis feature that helps blind users understand video content through intelligent screenshot analysis and audio descriptions.

## How It Works

### Voice Command
- **Command:** "capture" (or variations like "captur", "capure", "capature")
- **Action:** Takes a screenshot of the current video frame and analyzes it using Google's Gemini AI

### Workflow
1. **Voice Recognition:** User says "capture" while watching a video
2. **Screenshot Capture:** System captures the current video frame using HTML5 Canvas
3. **AI Analysis:** Image is sent to Gemini AI with educational context
4. **Audio Feedback:** AI analysis is converted to speech for the user

## Technical Implementation

### Key Components

#### GeminiAnalysisService
- **Location:** `src/services/GeminiAnalysisService.ts`
- **Purpose:** Handles video frame capture and AI analysis
- **Key Methods:**
  - `captureVideoFrame()`: Screenshots the current video frame
  - `analyzeScene()`: Sends image to Gemini API with context
  - `formatForSpeech()`: Prepares analysis for audio output

#### Enhanced Voice Commands
- **Location:** `src/hooks/useVoiceControl.ts`
- **Enhancement:** Added fuzzy matching for "capture" command variations
- **Pattern Matching:** Handles mispronunciations and speech recognition errors

#### Video Content Context
- **Location:** `src/types/index.ts`
- **Classes:** Polymorphic `VideoContent` system for context-aware AI prompts
- **Implementation:** `EducationalVideoContent` provides subject-specific context

## Usage Instructions

### For Users
1. Load a video in the platform
2. Hold spacebar to activate voice recognition
3. Say "capture" when you want to analyze the current scene
4. Listen to the AI-generated audio description

### For Developers
1. Set your Gemini API key in `.env`:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
2. Get API key from: https://makersuite.google.com/app/apikey
3. The system will use 'demo_key' if no API key is provided

## Features

### Accessibility-First Design
- **Audio-Only Interface:** All feedback provided through speech synthesis
- **Voice Command Recognition:** Flexible command matching handles speech variations
- **Context-Aware Analysis:** AI provides educational context relevant to video content

### AI Analysis Capabilities
- **Scene Description:** Detailed description of visual elements
- **Key Element Extraction:** Identifies important educational components
- **Educational Context:** Tailored analysis based on video subject matter
- **Timestamp Integration:** Analysis includes current video position

### Error Handling
- **Graceful Degradation:** Fallback messages if AI analysis fails
- **Network Resilience:** Handles API timeouts and errors
- **User Feedback:** Clear audio notifications for all system states

## Example Usage

### Voice Command Session
```
User: *holds spacebar*
System: "Listening for commands..."
User: "capture"
System: "Capturing scene for analysis..."
System: "Scene analysis: The video shows a code editor displaying JavaScript function syntax. Key elements visible include variable declarations, function parameters, and code commenting. This appears to be demonstrating basic programming concepts suitable for beginners."
```

### Command Variations Supported
- "capture" ✓
- "captur" ✓  
- "capure" ✓
- "capature" ✓
- "capture scene" ✓
- "analyze scene" ✓

## Technical Notes

### Performance Considerations
- Canvas-based screenshot is efficient and real-time
- AI analysis runs asynchronously to avoid blocking UI
- Speech synthesis queues properly with other audio feedback

### Security & Privacy
- API key stored securely in environment variables
- Screenshots processed client-side before API transmission
- No persistent storage of captured images

### Browser Compatibility
- Requires modern browsers with Canvas API support
- Web Speech API required for voice commands
- Works best in Chrome/Edge for speech recognition

## Future Enhancements
- Cached analysis results for repeated timestamps
- Multiple AI model support beyond Gemini
- Custom vocabulary training for domain-specific content
- Integration with screen reader technologies