# Julia 3D Talking Head

A full-stack demo app rendering a 3D avatar in the browser using `@met4citizen/talkinghead` and proxying Gemini AI requests through a lightweight Node.js server.

## Features

- Browser-only 3D rendering with Three.js and TalkingHead
- Gemini API proxy for structured JSON responses
- Interactive audio unlock screen for modern browser autoplay policies
- ES module-based `server.js` and frontend assets
- Production-ready static asset serving with Express

## Files

- `.env.example` - example environment variables
- `.gitignore` - ignores dependencies and local secrets
- `package.json` - project metadata and `start` script
- `server.js` - Express server and Gemini proxy endpoint
- `public/index.html` - app UI
- `public/css/style.css` - styling
- `public/js/app.js` - browser app logic and TalkingHead integration

## Setup

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` in `.env`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

## Gemini Proxy

The server exposes `/api/gemini` to forward client prompts to the Gemini API and validate the response schema:

```json
{
  "speechText": "Hello, I'm Julia.",
  "avatarMood": "happy",
  "avatarGesture": "handup"
}
```

## Notes

- The client uses TalkingHead from a CDN and loads the avatar model remotely.
- 3D rendering, lip sync, and audio playback run entirely in the browser.
- The server is only used for static asset delivery and Gemini API proxying.

## Environment

Add the following to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_TTS_API_KEY=your_google_tts_api_key_here
```

## Issues Faced and Fixes

### 1. SSH Push Setup
- Issue: The repo remote was configured over HTTPS, and the SSH agent was not running.
- Fix: Started a local `ssh-agent`, loaded the provided SSH key (`~/.ssh/id_ed25519_sumin1`), and confirmed GitHub SSH authentication.
- Result: SSH authentication now works for pushing.

### 2. Node Dependency Error
- Issue: `node-fetch@^3.4.2` did not exist, causing `npm install` to fail.
- Fix: Removed `node-fetch` and used Node 24's native global `fetch` in `server.js`.

### 3. TalkingHead CDN Import Compatibility
- Issue: The browser frontend imported Three.js directly and could conflict with TalkingHead imports.
- Fix: Added an import map in `public/index.html` and imported `TalkingHead` via `talkinghead`.

### 4. Audio Autoplay Policy
- Issue: Modern browsers block unprompted audio playback.
- Fix: Implemented an explicit audio unlock button before allowing the `Ask Julia` action.

### 5. Structured Gemini Responses
- Issue: Gemini must return valid JSON in a strict schema.
- Fix: The server validates `speechText`, `avatarMood`, and `avatarGesture`, rejects invalid schema values, and returns clear errors.

## Project Overview

This project implements a lightweight full-stack app with these responsibilities:

- `server.js`: Serves static files and proxies two endpoints:
  - `/api/gemini` for Gemini free-form prompt processing
  - `/api/tts` for Google Text-to-Speech requests
- `public/index.html`: Main UI, an unlock button, prompt input, and avatar canvas.
- `public/css/style.css`: Responsive styling for both the control panel and avatar.
- `public/js/app.js`: Frontend behavior:
  - loads TalkingHead and a remote avatar model
  - unlocks audio via user interaction
  - sends prompts to `/api/gemini`
  - updates the avatar mood, gesture, and speech text
  - plays TTS from `/api/tts` through the browser audio context

## Running the Project

1. Create `.env` from `.env.example`.
2. Set the keys in `.env`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000`.

## Notes for Future Users

- Make sure both `GEMINI_API_KEY` and `GOOGLE_TTS_API_KEY` are valid.
- The browser does the 3D rendering and lip-sync work; the server only proxies API requests.
- If the avatar fails to load, check the remote GLB model URL and network access.

## License

This project is provided without warranty.
