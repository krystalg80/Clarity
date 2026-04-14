# Clarity

Welcome to **Clarity**, a comprehensive mobile wellness platform designed to help you track your mental and physical health — all in one place.

> Coming soon to the **App Store** and **Google Play**.

---

## Features

- **User Authentication** — Secure sign up and log in to keep your wellness journey personal and private.
- **Dashboard** — A personalized home screen with daily affirmations and a snapshot of your wellness progress.
- **Workout Tracking** — Log and monitor your daily workouts to stay on top of your fitness goals.
- **Water Intake Logging** — Track your daily water consumption to stay hydrated and healthy.
- **Meditation Sessions** — Log meditation sessions with AI-powered soundscape recommendations tailored to your mood and meditation type.
- **Mood & Journal Notes** — Capture daily reflections and mood check-ins with sentiment analysis.
- **Goals** — Set and track personal wellness goals to stay focused and motivated.
- **Wellness Garden** — A visual representation of your consistency and growth over time.
- **Mini Games** — Mindfulness-inspired games (including Flappy Mind) to help you decompress and stay engaged.
- **Push Notifications** — Gentle reminders to keep you on track with your wellness habits.

---

## Tech Stack

- **Framework**: React Native (Expo) with Expo Router
- **Language**: TypeScript
- **Backend / Auth**: Firebase
- **Notifications**: Expo Notifications
- **Audio**: Expo AV
- **Storage**: Expo Secure Store & AsyncStorage

---

## Getting Started

### Prerequisites

- Node.js
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
git clone https://github.com/your-username/ClarityNative.git
cd ClarityNative
npm install
```

### Running the App

```bash
# Start the development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

---

## Project Structure

```
app/
  (auth)/       # Login & registration screens
  (tabs)/       # Main tab screens
    dashboard   # Home with affirmations & overview
    workout     # Workout logging
    water       # Water intake tracker
    meditation  # Meditation sessions & soundscapes
    notes       # Journal & mood check-ins
    goals       # Personal goal setting
    garden      # Wellness garden visualization
    games       # Mindfulness mini-games
    profile     # User profile & settings
```
