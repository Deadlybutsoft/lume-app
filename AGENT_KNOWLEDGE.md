# LUME — Agent Knowledge

## Project Name
**LUME — Stadium Phone Light Show**

## What it is
A web app that synchronizes thousands of audience phones to create live, coordinated light shows inside a stadium or concert venue. Fans open a link, join a room, and their phone becomes part of a giant pixel display (screen flash or hardware torch). The organizer controls patterns, colors, waves, and text in real time from a dashboard.

## Why we’re building it
Stadium light shows are usually expensive and locked behind proprietary hardware. LUME lets any event create cinematic, synchronized light shows using only phones and an internet connection. It also fits the hackathon theme by using:

- Cloudflare Workers (edge compute)
- Durable Objects (live room state + real-time coordination)
- ElevenLabs (voice layer for announcements and hype cues)

---

## Core Architecture

### Frontend (Next.js)
- Landing page to create/join a show
- Organizer dashboard (controls patterns/colors/text)
- Fan view (flashlight or full-screen flash)

### Cloudflare Workers + Durable Objects
- A Worker exposes `/ws` WebSocket endpoint
- Each show is a Durable Object room (single source of truth)
- Broadcasts state updates to all connected fans
- Tracks connected fan count via heartbeats

### ElevenLabs (later)
- Voice announcer and timing cues
- Multi-language show prompts
- Optional artist/MC voice narration
- **Single live transcript architecture:** capture the artist mic once, transcribe once, then broadcast that text to all fans (no per-fan transcription)
- **Clean flow:**
  1. Organizer dashboard captures the artist mic (Web Audio / MediaRecorder)
  2. Organizer streams audio to the Worker (WebSocket or chunked POST)
  3. Worker sends audio to ElevenLabs STT
  4. Transcription happens once
  5. Durable Object fans the text out to all connected fans
- **Open questions for implementation:**
  - Use ElevenLabs realtime STT or batch STT?
  - How is mic audio captured right now?
  - Do we want partial live text (streaming words) or only final lines?

---

## Current Status (what's already done)

- Converted Vite app to Next.js
- Set up Cloudflare Worker + Durable Object backend
- Frontend now connects to the Worker over WebSockets
- Room selection based on URL `event` / `eventName`

---

## What’s left to build

### 1) Wire frontend to Worker in prod
- Deploy the Worker
- Update frontend to use live Worker URL

### 2) Show-room auth (optional)
- Simple access key from organizer → fan URL

### 3) ElevenLabs voice layer
- Add “Announcer” voice cues triggered from Organizer Dashboard
- Example: “3, 2, 1… lights up!”
- **Live mic transcript feature:** organizer mic → ElevenLabs Scribe v2 Realtime → one transcript stream broadcast to all fans

### 4) Polish
- Clean UI
- Add real-time stats
- Short cinematic demo video

---

## Local Dev Commands

### Worker
```bash
cd /Users/suvog/Downloads/jume-master/workers
npm install
npm run dev
```

Environment:
```bash
NEXT_PUBLIC_WS_HOST=127.0.0.1:8787
NEXT_PUBLIC_WS_PROTOCOL=ws:
```

### Next App
```bash
cd /Users/suvog/Downloads/jume-master
npm run dev
```

---

## Final Flow (user journey)
1. Organizer opens landing page
2. Creates show (event name, layout, capacity)
3. Shares link/QR with fans
4. Fans join and their phones sync
5. Organizer triggers patterns + text + colors
6. ElevenLabs voice announces and hypes the crowd
7. Entire stadium becomes a living light display
