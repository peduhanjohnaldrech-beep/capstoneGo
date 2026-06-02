# CapstoneGo

A mobile application for managing capstone research projects — built for students and panel members.

## Features

### Student
- Create and manage capstone projects with custom chapters
- Track chapter progress (Not Started → In Progress → For Review → Done)
- Add sub-tasks inside each chapter
- Set deadlines with automatic 1-day-before notifications
- Invite group members via email
- View panel revision notes and adviser feedback
- Track revision status per chapter

### Panel
- Create defense sessions with custom scoring criteria
- Countdown timer per presenter with alarm
- Score each criterion with +/− controls
- Add notes per criterion and per presenter
- Set verdict: Passed / Passed with Revisions / Failed
- Send revision notes directly to student projects
- Export results as PDF (full scorecard or revision report)

## Tech Stack

- **React Native** + **Expo SDK 54**
- **Firebase** (Auth, Firestore, Storage)
- **React Navigation** (Stack + Bottom Tabs)
- **expo-notifications** — deadline reminders
- **expo-print** + **expo-sharing** — PDF export
- **EAS Build** — Android APK builds

## Project Structure

```
src/
├── config/         # Firebase setup
├── context/        # AuthContext, ThemeContext
├── navigation/     # AppNavigator (role-based routing)
├── screens/
│   ├── auth/       # Login, Register, ForgotPassword
│   ├── student/    # Dashboard, ProjectDetail, Tasks, Checklist, Profile
│   └── panel/      # PanelDashboard, NewSession, DefenseSession, SessionResults
├── utils/          # notifications.js, theme.js
└── components/     # ErrorBoundary
```

## Getting Started

### Prerequisites
- Node.js
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npx expo start
```

### Build APK (Android)
```bash
eas build --platform android --profile preview
```

## Environment Setup

This project requires a `google-services.json` file from Firebase placed in the root directory. This file is excluded from the repository for security reasons.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Project Settings → Android app
3. Download `google-services.json`
4. Place it in `C:\CapstoneGo\google-services.json`

## User Roles

| Role | Access |
|---|---|
| `student` | Project management, chapter tracking, tasks, feedback |
| `panel` | Defense sessions, scoring, verdicts, PDF export |

Role is selected during registration and stored in Firestore.

## License

For academic use only.
