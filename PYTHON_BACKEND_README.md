# Python Backend Setup - Voice Learning Platform

## Overview
This setup adds **OpenAI Whisper** and **liblouis** support for professional-grade audio processing and braille translation, enabling real-time video audio to braille conversion.

## Why Python Backend?
- **Whisper**: State-of-the-art speech recognition that works with any audio source
- **liblouis**: Professional braille translation library used by screen readers
- **Video Audio Capture**: Directly processes video soundtrack, not just microphone input

## Quick Start

### Windows:
1. Double-click `start_python_backend.bat`
2. Wait for "Backend ready" message
3. In a new terminal: `npm run dev`
4. Open http://localhost:3001 and click the "⠃⠗⠇ OFF" button

### Mac/Linux:
1. `python setup_python_backend.py`
2. `python python-backend/app.py`
3. In a new terminal: `npm run dev`
4. Open http://localhost:3001 and click the "⠃⠗⠇ OFF" button

## How It Works

### Audio Pipeline:
1. **Web Audio API** captures video soundtrack in real-time
2. **Audio chunks** are sent to Python backend every 3 seconds
3. **Whisper** transcribes audio to text with high accuracy
4. **liblouis** converts text to professional-grade braille
5. **Real-time display** shows braille translation in the side panel

### Features:
- ✅ **Video Audio Capture** - Processes actual video soundtrack
- ✅ **Whisper Transcription** - Industry-leading speech recognition
- ✅ **Professional Braille** - liblouis Grade 1 translation
- ✅ **Real-time Processing** - 3-second latency for live content
- ✅ **Fallback Support** - JavaScript braille if Python unavailable

## Installation Details

### Python Dependencies:
```bash
pip install -r python-requirements.txt
```

### Key Packages:
- `openai-whisper` - Advanced speech recognition
- `liblouis` - Professional braille translation  
- `flask` - Web server for API
- `numpy` - Audio processing
- `soundfile` - Audio file handling

### First Run:
- Whisper will download ~140MB base model on first use
- liblouis braille tables are included
- Backend runs on port 5000, frontend on port 3001

## API Endpoints

### POST /process-audio
Processes audio data and returns both transcript and braille:
```json
{
  "audio_data": "base64_encoded_wav",
  "sample_rate": 16000,
  "braille_table": "en-us-g1.ctb"
}
```

### POST /braille  
Converts text to braille:
```json
{
  "text": "Hello world",
  "table": "en-us-g1.ctb"
}
```

### GET /health
Health check endpoint

## Browser Requirements
- **Chrome/Edge** (preferred) - Full Web Audio API support
- **Firefox/Safari** - Limited audio capture capabilities
- **HTTPS/localhost** - Required for microphone/audio access

## Troubleshooting

### Python Backend Issues:
- Ensure Python 3.8+ is installed
- Try: `python -m pip install -r python-requirements.txt`
- Check firewall allows port 5000

### Audio Capture Issues:
- Grant microphone permissions in browser
- Ensure video has audio track
- Try Chrome/Edge for best compatibility

### Performance:
- First transcription may be slower (model loading)
- Adjust processing interval in PythonBackendService.ts if needed
- Use 'base' model for speed, 'large' for accuracy

## Success Indicators:
1. ✅ Python backend shows "🐍 Whisper + liblouis" in braille panel
2. ✅ Status shows "Processing Video Audio" when video plays
3. ✅ Braille text appears in real-time as video audio plays
4. ✅ Console shows "Video audio capture started with Python backend"

## Architecture:
```
Video Element → Web Audio API → Audio Chunks → 
Python Flask Server → Whisper → liblouis → 
Braille Display Panel
```

This provides professional-grade accessibility with enterprise-quality speech recognition and braille translation!