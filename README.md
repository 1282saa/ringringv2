# Ringle AI English Learning MVP

AI-powered English conversation practice app with real-time voice interaction.

**Last Updated**: 2026-01-12
**Development Method**: AI-Assisted Development (Claude Code)
**Tech Stack**: React 19 + Vite 7 + Capacitor + AWS Lambda + Claude AI

---

## Project Overview

Ringle AI English Learning MVP is a mobile-first application that enables users to practice English speaking through real-time voice conversations with an AI tutor. The app provides personalized tutoring with customizable accents, difficulty levels, and topics, along with detailed post-conversation analysis.

**Target Platform**: iOS, Android, Web
**Primary Language**: Korean UI / English Conversation
**AI Model**: Claude Haiku via AWS Bedrock

---

## Key Features

### Voice Conversation
- Real-time speech recognition (Web Speech API)
- Natural AI responses (Claude Haiku)
- High-quality text-to-speech (Amazon Polly)
- Multiple accent support (US, UK, AU, IN)

### Customization
- Tutor gender selection
- Speaking speed control
- Difficulty levels (Beginner/Intermediate/Advanced)
- Topic selection (Business, Daily, Travel, Interview)

### Analysis & Feedback
- CAFP scoring (Complexity, Accuracy, Fluency, Pronunciation)
- Grammar correction with explanations
- Filler word detection
- Vocabulary analysis
- Personalized improvement tips

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Clone repository
git clone https://github.com/1282saa/ringgle.git
cd ringgle

# Install dependencies
npm install

# Start development server
npm run dev
# Opens http://localhost:5173
```

### Build & Deploy

```bash
# Build for production
npm run build

# Sync to mobile platforms
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

---

## Project Structure

```
eng-learning/
├── src/
│   ├── pages/
│   │   ├── Home.jsx        # Main screen
│   │   ├── Call.jsx        # Voice conversation
│   │   ├── Result.jsx      # Analysis & feedback
│   │   └── Settings.jsx    # Tutor customization
│   ├── utils/
│   │   └── api.js          # API client
│   ├── App.jsx             # Routes
│   └── main.jsx            # Entry point
├── backend/
│   └── lambda_function.py  # AWS Lambda handler
├── android/                # Capacitor Android
├── ios/                    # Capacitor iOS
├── docs/
│   └── phase/              # Development documentation
└── package.json
```

---

## Documentation

### Development Phases

| Phase | Title | Status |
|-------|-------|--------|
| [Phase 1](docs/phase/PHASE-01-project-setup.md) | Project Setup | ✅ |
| [Phase 2](docs/phase/PHASE-02-voice-conversation.md) | Voice Conversation | ✅ |
| [Phase 3](docs/phase/PHASE-03-tutor-settings.md) | Tutor Settings | ✅ |
| [Phase 4](docs/phase/PHASE-04-call-analysis.md) | Call Analysis | ✅ |
| [Phase 5](docs/phase/PHASE-05-github-setup.md) | GitHub Setup | ✅ |
| [Phase 6](docs/phase/PHASE-06-ai-phone-tab.md) | AI Phone Tab | ✅ |
| [Phase 7](docs/phase/PHASE-07-home-tab-refactor.md) | Home Tab Refactor | ✅ |
| [Phase 8](docs/phase/PHASE-08-session-management.md) | Session Management | ✅ |
| [Phase 9](docs/phase/PHASE-09-ux-ui-improvements.md) | UX/UI Improvements | ✅ |
| [Phase 10](docs/phase/PHASE-10-call-tab-ui-refinement.md) | Call Tab UI Refinement | ✅ |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool |
| React Router | 7.12.0 | Routing |
| Capacitor | 8.0.0 | Mobile Bridge |
| Framer Motion | 12.25.0 | Animations |
| Lucide React | 0.562.0 | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| AWS Lambda | Serverless Functions |
| AWS Bedrock | Claude AI |
| Amazon Polly | Text-to-Speech |
| AWS Transcribe | Speech-to-Text |
| Python 3.11 | Lambda Runtime |

---

## API Reference

**Endpoint:** `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

### Actions

| Action | Description | Request Body |
|--------|-------------|--------------|
| `chat` | AI conversation | `{ messages, settings }` |
| `tts` | Text-to-speech | `{ text, settings }` |
| `stt` | Speech-to-text | `{ audio, language }` |
| `analyze` | Analysis | `{ messages }` |

### Example Request

```bash
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "settings": {
      "accent": "us",
      "level": "intermediate",
      "topic": "daily"
    }
  }'
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npx cap sync` | Sync to mobile |

---

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Speech Recognition | ✅ | ⚠️ | ❌ | ✅ |
| Audio Playback | ✅ | ✅ | ✅ | ✅ |
| Microphone | ✅ | ✅ | ✅ | ✅ |

**Note:** HTTPS required for microphone access.

---

## Environment Variables

### Frontend (`.env.local`)
```env
VITE_API_URL=https://your-api-gateway-url/prod/chat
```

### Backend (Lambda Environment)
```env
AWS_REGION=us-east-1
S3_BUCKET=eng-learning-audio
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

Proprietary - All Rights Reserved

---

## Contact

- **Repository**: https://github.com/1282saa/ringgle
- **Issues**: https://github.com/1282saa/ringgle/issues

---

Copyright 2026 Ringle AI English Learning Project.
