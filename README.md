# 🎤 Voice-Controlled Learning Platform

A modern, accessible learning platform designed specifically for blind users, featuring advanced voice control, screen reader support, and a beautiful interface built with React and Reshaped UI.

## ✨ Features

### 🎯 Accessibility First
- **Voice Control**: Hold spacebar to activate voice commands
- **Text-to-Speech**: Audio feedback for all actions and navigation
- **Screen Reader Support**: Full ARIA compliance and semantic markup
- **Keyboard Navigation**: Complete keyboard accessibility
- **High Contrast**: Optimized visual design for low vision users

### 🎬 Video Player
- Custom-built accessible video player
- Voice-controlled playback (Play, Pause, Stop, Rewind, Forward)
- Speed control (Slow down, Speed up)
- Volume control with voice commands
- Fullscreen support
- Progress tracking with audio feedback

### 🗣️ Voice Commands
- **Playback**: "Play", "Pause", "Stop", "Repeat"
- **Navigation**: "Rewind" (10s back), "Forward" (10s ahead)
- **Audio**: "Volume up", "Volume down", "Mute", "Unmute"
- **Display**: "Fullscreen", "Exit fullscreen"
- **Speed**: "Slow down", "Speed up"
- **Help**: "Help" for command reference

### 🎨 Modern UI
- Built with Reshaped UI library for professional design
- Responsive layout that works on all devices
- Dark mode compatible
- Smooth animations and transitions
- Clean, distraction-free interface

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Microphone access for voice control

### Installation

1. **Clone and setup**:
   ```bash
   cd blnd
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:3000`

### Usage

1. **Enable voice control**: Allow microphone access when prompted
2. **Voice commands**: Hold spacebar and speak your command
3. **Keyboard shortcuts**: 
   - Spacebar: Play/Pause
   - Arrow keys: Seek
   - M: Mute
   - F: Fullscreen
4. **Screen readers**: Fully compatible with NVDA, JAWS, VoiceOver

## 🏗️ Architecture

### Frontend Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Reshaped UI**: Professional component library with accessibility focus
- **Vite**: Fast build tool and development server

### Key Components
- `VoiceLearningPlatform`: Main application component
- `VideoPlayer`: Custom accessible video player
- `useVoiceControl`: Voice recognition and speech synthesis hook
- `useVideoPlayer`: Video control and state management hook

### Accessibility Technologies
- **Web Speech API**: Voice recognition and text-to-speech
- **ARIA Labels**: Screen reader compatibility
- **Semantic HTML**: Proper document structure
- **Keyboard Events**: Complete keyboard navigation

## 🎛️ Voice Control Details

### Activation
- **Hold spacebar** to start voice recognition
- **Release spacebar** to process the command
- Visual and audio feedback confirms activation

### Command Processing
- Uses Web Speech API for recognition
- Supports natural language variations
- Provides audio confirmation
- Falls back gracefully if not understood

### Supported Browsers
- ✅ Chrome/Chromium (Recommended)
- ✅ Microsoft Edge
- ✅ Safari (limited support)
- ❌ Firefox (Web Speech API not supported)

## 🔧 Configuration

### Video Content
- Place video files in `public/assets/videos/`
- Supported formats: MP4, WebM, OGV
- Update video source in `VoiceLearningPlatform.tsx`

### Customization
- Modify voice commands in `useVoiceControl.ts`
- Adjust accessibility settings in component props
- Customize UI theme in `main.tsx` Reshaped provider

## 🎯 Accessibility Testing

The platform has been designed to meet:
- **WCAG 2.1 AA** compliance
- **Section 508** requirements
- **EN 301 549** European accessibility standard

### Testing Tools
- Screen readers: NVDA, JAWS, VoiceOver
- Keyboard navigation testing
- Voice control testing
- Color contrast analysis

## 🔊 Browser Compatibility

### Voice Recognition Support
| Browser | Support | Notes |
|---------|---------|--------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Recommended |
| Safari | ⚠️ Limited | Basic support |
| Firefox | ❌ None | API not supported |

### Fallback Options
- On-screen controls remain fully functional
- Keyboard shortcuts provide alternative input
- Screen reader compatibility maintained

## 📁 Project Structure

```
blnd/
├── src/
│   ├── components/          # React components
│   │   ├── VideoPlayer.tsx
│   │   └── VoiceLearningPlatform.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useVoiceControl.ts
│   │   └── useVideoPlayer.ts
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── public/
│   └── assets/
│       └── videos/         # Video content
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## 🛠️ Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 🤝 Contributing

This project welcomes contributions that improve accessibility:

1. Test with screen readers
2. Verify keyboard navigation
3. Check voice command accuracy
4. Validate WCAG compliance
5. Submit accessibility improvements

## 📄 License

MIT License - Feel free to use this project as a foundation for accessible web applications.

## 🌟 Acknowledgments

- **Reshaped UI**: Beautiful, accessible component library
- **Web Speech API**: Browser voice recognition and synthesis
- **React**: Modern web development framework
- **Accessibility community**: Guidelines and best practices

---

**Built with ❤️ for accessibility and inclusive design**