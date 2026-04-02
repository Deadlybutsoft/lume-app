# STADIUM-BASE44 - Complete Project Documentation

> Last Updated: Feb 28, 2026
> Version: 1.0.4

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Type Definitions](#3-type-definitions)
4. [Constants & Configuration](#4-constants--configuration)
5. [Application State Management](#5-application-state-management)
6. [Components Deep Dive](#6-components-deep-dive)
7. [Services & Utilities](#7-services--utilities)
8. [User Interfaces & Flows](#8-user-interfaces--flows)
9. [URL Parameters & Routing](#9-url-parameters--routing)
10. [Animation & Pattern Logic](#10-animation--pattern-logic)
11. [QR Code & Ticket Generation](#11-qr-code--ticket-generation)
12. [Socket Events Reference](#12-socket-events-reference)
13. [Deployment & Setup](#13-deployment--setup)

---

## 1. Project Overview

### 1.1 What is STADIUM-BASE44?

**STADIUM-BASE44** is a real-time stadium light show synchronization application that enables event organizers to control the flashlights of thousands of audience members' phones remotely. It creates a coordinated light display similar to stadium "light shows" but using each attendee's smartphone as a pixel in a massive display.

### 1.2 Core Features

| Feature | Description |
|---------|-------------|
| **Real-time Sync** | Synchronizes phone flashlights across thousands of devices |
| **Multiple Light Modes** | 7 different effects: OFF, ON, STROBE, PULSE, WAVE, SPARKLE, TEXT |
| **Visual Stadium Grid** | Admin dashboard shows live stadium representation |
| **QR Code Access** | Fans join via QR code scan |
| **Auto-Seat Assignment** | Pre-assigned seats via URL parameters |
| **Demo Mode** | Simulate fan counts for testing |
| **Hardware Flashlight** | Uses phone's actual torch (when available) |
| **Screen Fallback** | Falls back to screen flash if torch unavailable |

### 1.3 Two User Roles

#### Organizer (Admin)
- Creates events with custom names
- Controls light effects from dashboard
- Views real-time connected fan count
- Generates QR codes for fan access
- Can test individual seat patterns

#### Fan (Participant)
- Joins via QR code or link
- Assigned to specific seat (section, row, seat)
- Phone flashlight syncs with organizer's commands
- Sees status on phone screen

---

## 2. Technical Architecture

### 2.1 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Framework** | React 18+ | UI components and state management |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite | Fast development and building |
| **Styling** | Tailwind CSS | Responsive styling |
| **Real-time Communication** | Socket.io | WebSocket client |
| **Hardware Access** | Web APIs | Flashlight control |
| **State Management** | React Hooks | useState, useEffect, useRef |
| **Canvas Rendering** | HTML5 Canvas | Stadium grid visualization |
| **QR Generation** | QRServer API | Generate QR codes |

### 2.2 Project File Structure

```
STADIUM-BASE44/
├── App.tsx                     # Main application (1200+ lines)
├── index.tsx                   # React entry point
├── index.html                  # HTML template
├── types.ts                    # TypeScript type definitions
├── constants.ts                # Configuration constants
├── metadata.json               # App metadata
├── package.json                # NPM dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── .env.local                  # Environment variables
├── .gitignore                  # Git ignore rules
├── README.md                   # Project readme
├── dist/                       # Production build output
├── components/
│   ├── ControlPanel.tsx        # Admin control dashboard
│   ├── StadiumGrid.tsx         # Visual stadium renderer
│   └── FanView.tsx             # Fan phone interface
├── services/
│   ├── syncService.ts         # WebSocket communication
│   └── flashlightService.ts   # Hardware torch control
└── server/                     # Backend server (Socket.io)
```

### 2.3 Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "socket.io-client": "^4.x",
    "tailwindcss": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@types/react": "^18.x"
  }
}
```

---

## 3. Type Definitions

### File: `types.ts`

```typescript
// Light Mode Types
// Controls the visual effect displayed on fans' phones
export type LightMode = 'OFF' | 'ON' | 'STROBE' | 'WAVE' | 'PULSE' | 'SPARKLE' | 'TEXT';

// Stadium Seat Interface
// Represents a single seat in the stadium
export interface StadiumSeat {
  id: string;           // Unique identifier (e.g., "5-12")
  row: number;          // Row number (0-indexed internally)
  col: number;          // Column number (0-indexed internally)
  section: string;      // Section name (e.g., "Sec 101")
}

// Light State Interface
// Controls individual pixel/light state
export interface LightState {
  isActive: boolean;    // Is the light on/off
  color: string;        // Hex color code
  intensity: number;    // Brightness (0 to 1)
  mode: LightMode;      // Current light mode
  startTime?: number;   // When this mode started (timestamp)
}

// Stadium Configuration
// Defines stadium dimensions and section layout
export interface StadiumConfig {
  rows: number;           // Number of rows (default: 32)
  cols: number;           // Number of columns (default: 192)
  sections: string[];     // Section names array
}

// Application Role
// Enum for user roles in the application
export enum AppRole {
  ADMIN = 'ADMIN',       // Organizer/creator
  FAN = 'FAN'            // Participant/viewer
}
```

---

## 4. Constants & Configuration

### File: `constants.ts`

```typescript
// Stadium Configuration Constants
export const STADIUM_CONFIG = {
  // Dimensions - High resolution grid
  DEFAULT_ROWS: 32,      // 32 rows of seats
  DEFAULT_COLS: 192,    // 192 columns (high resolution)
  
  // Section Names - Four sides of stadium
  SECTION_NAMES: [
    'East Stand',   // Right side
    'North End',    // Top curve
    'West Stand',   // Left side
    'South End'     // Bottom curve
  ],
  
  // Animation timing (milliseconds)
  ANIMATION_SPEED: 100  // Frame update interval
};

// Color Palette
export const COLORS = {
  PRIMARY: '#3b82f6',     // Blue - main accent
  SECONDARY: '#ec4899',  // Pink - secondary accent
  SUCCESS: '#22c55e',    // Green - success states
  WARNING: '#eab308',    // Yellow - warnings
  WHITE: '#ffffff',      // White - default light
  BLACK: '#000000',      // Black - backgrounds
  FIELD: '#15803d'      // Field green - center field
};

// 3x5 Bitmap Font for Text Display
// Each character is represented by 5 integers (one per row)
// Each integer is a 3-bit number representing column pixels
// Example: 'A' = [2, 5, 7, 5, 5]
// Binary: [010, 101, 111, 101, 101]
export const FONT_3X5: Record<string, number[]> = {
  // Letters A-Z
  'A': [2, 5, 7, 5, 5],  'B': [6, 5, 6, 5, 6],  'C': [7, 4, 4, 4, 7],
  'D': [6, 5, 5, 5, 6],  'E': [7, 4, 6, 4, 7],  'F': [7, 4, 6, 4, 4],
  'G': [3, 4, 5, 5, 3],  'H': [5, 5, 7, 5, 5],  'I': [7, 2, 2, 2, 7],
  'J': [1, 1, 1, 5, 2],  'K': [5, 5, 6, 5, 5],  'L': [4, 4, 4, 4, 7],
  'M': [5, 7, 5, 5, 5],  'N': [6, 5, 5, 5, 5],  'O': [2, 5, 5, 5, 2],
  'P': [6, 5, 6, 4, 4],  'Q': [2, 5, 5, 6, 3],  'R': [6, 5, 6, 5, 5],
  'S': [3, 4, 2, 1, 6],  'T': [7, 2, 2, 2, 2],  'U': [5, 5, 5, 5, 7],
  'V': [5, 5, 5, 5, 2],  'W': [5, 5, 5, 7, 5],  'X': [5, 5, 2, 5, 5],
  'Y': [5, 5, 2, 2, 2],  'Z': [7, 1, 2, 4, 7],
  
  // Numbers 0-9
  '0': [2, 5, 5, 5, 2],  '1': [2, 6, 2, 2, 7],  '2': [6, 1, 2, 4, 7],
  '3': [6, 1, 2, 1, 6],  '4': [5, 5, 7, 1, 1],  '5': [7, 4, 6, 1, 6],
  '6': [3, 4, 6, 5, 2],  '7': [7, 1, 2, 4, 4],  '8': [2, 5, 2, 5, 2],
  '9': [2, 5, 7, 1, 2],
  
  // Special Characters
  ' ': [0, 0, 0, 0, 0],   // Space
  '-': [0, 0, 7, 0, 0],   // Dash
  '.': [0, 0, 0, 0, 2],   // Period
  '!': [2, 2, 2, 0, 2],   // Exclamation
  '?': [2, 5, 1, 0, 2]    // Question mark
};
```

---

## 5. Application State Management

### File: `App.tsx` - State Variables

#### 5.1 Core Role State
```typescript
// Current user role (ADMIN or FAN or null for landing)
const [role, setRole] = useState<AppRole | null>(null);

// Stadium configuration (dimensions and section names)
const [stadiumConfig] = useState<StadiumConfig>({
  rows: STADIUM_CONFIG.DEFAULT_ROWS,    // 32
  cols: STADIUM_CONFIG.DEFAULT_COLS,    // 192
  sections: STADIUM_CONFIG.SECTION_NAMES
});
```

#### 5.2 Global Show State
```typescript
// Current light mode (OFF, ON, STROBE, PULSE, WAVE, SPARKLE, TEXT)
const [mode, setMode] = useState<LightMode>('OFF');

// Current color for lights
const [color, setColor] = useState<string>(COLORS.WHITE);

// Active scrolling message (for TEXT mode)
const [activeMessage, setActiveMessage] = useState('');

// Global time ticker for synchronized animations (updates every 50ms)
const [globalTime, setGlobalTime] = useState(0);

// When TEXT mode started (for scroll calculations)
const [textStartTime, setTextStartTime] = useState(0);
```

#### 5.3 Demo Mode State
```typescript
// Whether demo mode is active (simulates fake fan counts)
const [isDemoMode, setIsDemoMode] = useState(false);

// Number of connected fans (real or simulated)
const [connectedCount, setConnectedCount] = useState(1);
```

#### 5.4 Test Mode State
```typescript
// Director's local flashlight test mode
const [isTestMode, setIsTestMode] = useState(false);

// Reference to flashlight service instance
const flashlightRef = useRef<FlashlightService | null>(null);
```

#### 5.5 Login/Room State
```typescript
// Whether to show login form
const [showLogin, setShowLogin] = useState(false);

// Event/match name (e.g., "SUPER BOWL LIX")
const [matchName, setMatchName] = useState('');

// Access password
const [password, setPassword] = useState('');

// Stadium capacity (for occupancy calculations)
const [capacity, setCapacity] = useState('');
```

#### 5.6 UI State
```typescript
// QR code modal visibility
const [showQR, setShowQR] = useState(false);

// Right drawer panel visibility
const [isDrawerOpen, setIsDrawerOpen] = useState(false);

// Whether to preview fan interface from admin view
const [viewFanInterface, setViewFanInterface] = useState(false);
```

#### 5.7 Simulation/Preview State
```typescript
// Set of active pixel positions (row-col format, e.g., "5-12")
const [activePixels, setActivePixels] = useState<Set<string>>(new Set());

// Fan seat assignment (row, col, section)
const [fanSeat, setFanSeat] = useState<{ row: number, col: number, section: string } | null>(null);

// Temporary form inputs for seat selection
const [tempSection, setTempSection] = useState('');
const [tempRow, setTempRow] = useState('');
const [tempCol, setTempCol] = useState('');

// Admin seat testing
const [previewSeat, setPreviewSeat] = useState<{ row: number, col: number, section: string } | null>(null);
const [isSimulating, setIsSimulating] = useState(false);
```

---

## 6. Components Deep Dive

### 6.1 ControlPanel.tsx

The control panel is the main dashboard where the organizer controls the light show.

#### 6.1.1 Mode Configuration Object

```typescript
// Configuration for each light mode
const modeConfig: Record<LightMode, { 
  bg: string;              // Background color class
  border: string;          // Border color class  
  glow: string;            // Glow/shadow effect
  icon: React.ReactNode   // Icon component
}> = {
  // OFF Mode - Red theme
  OFF: { 
    bg: 'bg-red-500/20', 
    border: 'border-red-500/60', 
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    icon: <svg>...</svg>  // X/off icon
  },
  
  // ON Mode - Blue theme, flashlight icon
  ON: { 
    bg: 'bg-blue-500/20', 
    border: 'border-blue-500/60', 
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    icon: <svg>...</svg>  // Lightbulb icon
  },
  
  // STROBE Mode - White theme, lightning icon
  STROBE: { 
    bg: 'bg-white/20', 
    border: 'border-white/60', 
    glow: 'shadow-[0_0_20px_rgba(255,255,255,0.5)]',
    icon: <svg>...</svg>  // Lightning bolt
  },
  
  // PULSE Mode - Purple theme, heart icon
  PULSE: { 
    bg: 'bg-purple-500/20', 
    border: 'border-purple-500/60', 
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    icon: <svg>...</svg>  // Heart icon
  },
  
  // WAVE Mode - Cyan theme, wave icon
  WAVE: { 
    bg: 'bg-cyan-500/20', 
    border: 'border-cyan-500/60', 
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
    icon: <svg>...</svg>  // Lightning (reuse)
  },
  
  // SPARKLE Mode - Yellow theme, star icon
  SPARKLE: { 
    bg: 'bg-yellow-500/20', 
    border: 'border-yellow-500/60', 
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    icon: <svg>...</svg>  // Star icon
  },
  
  // TEXT Mode - Green theme, chat icon
  TEXT: { 
    bg: 'bg-green-500/20', 
    border: 'border-green-500/60', 
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    icon: <svg>...</svg>  // Chat icon
  }
};
```

#### 6.1.2 Props Interface

```typescript
interface ControlPanelProps {
  // Callbacks
  onModeChange: (mode: LightMode) => void;      // Called when mode button clicked
  onColorChange: (color: string) => void;        // Called when color selected
  onTextChange: (text: string) => void;         // Called when text submitted
  
  // Current state
  currentMode: LightMode;   // Currently active mode
  currentColor: string;      // Currently selected color
}
```

#### 6.1.3 UI Elements

| Element | Type | Description |
|---------|------|-------------|
| **Master Effects** | Section Header | "MASTER EFFECTS" label with pulsing indicator |
| **Mode Buttons** | Grid (3x3) | 7 buttons for each mode with icons |
| **Broadcast Message** | Section Header | "BROADCAST MESSAGE" label |
| **Text Input** | Input Field | Max 50 chars, shows char count |
| **Send Button** | Button | Green gradient, disabled when empty |

#### 6.1.4 Button States

| State | Visual Effect |
|-------|---------------|
| **Inactive** | Semi-transparent bg, subtle border |
| **Active** | Colored bg, glowing border, pulse animation |
| **Hover** | Slight scale up (1.01x), brighter text |
| **Disabled** | Grayed out, cursor not-allowed |

---

### 6.2 StadiumGrid.tsx

The visual representation of the stadium on the admin dashboard.

#### 6.2.1 Props Interface

```typescript
interface StadiumGridProps {
  activePixels: Set<string>;           // Set of "row-col" strings that are lit
  config: { rows: number; cols: number; };  // Stadium dimensions
  highlightColor?: string;             // Color for active pixels (default: blue)
  onSeatClick?: (row: number, col: number) => void;  // Callback when seat clicked
  selectedPixel?: string | null;      // Currently selected seat for preview
}
```

#### 6.2.2 Stadium Geometry

The stadium is modeled as an oval/track shape:

```
        ╭─────────────────────╮
       ╱   NORTH END CURVE    ╲
      │                       │
      │    ░░░░░░░░░░░░░     │ ← Field (green)
      │    ░░░░░░░░░░░░░     │
       ╲   SOUTH END CURVE    ╱
        ╰─────────────────────╯

     West    ←→    East
    Stand     ←→   Stand
```

**Seat Calculation Parameters:**
- `straightLength`: 300 (length of straight sections)
- `innerRadius`: 80 (inner curve radius)
- `rowSpacing`: 4.5 (pixels between rows)

**Column Distribution:**
- Straight sections: `totalCols / 6` columns each
- Curve sections: `totalCols / 3` columns each

#### 6.2.3 Rendering Details

- Uses HTML5 Canvas for performance
- Responsive to window resize
- Handles device pixel ratio for crisp rendering
- Radial gradient background (dark blue to black)
- Field in center with green glow effect

---

### 6.3 FanView.tsx

The interface that fans see on their phones.

#### 6.3.1 Props Interface

```typescript
interface FanViewProps {
  seat: { row: number; col: number; section: string };  // User's seat position
  currentMode: LightMode;           // Current light mode from organizer
  currentColor: string;             // Current color
  globalTime: number;                // Sync time for animations
  isGlobalActive: boolean;          // Whether this seat should be lit
  eventName: string;                // Event name to display
}
```

#### 6.3.2 Torch Status States

| Status | Meaning |
|--------|---------|
| `'loading'` | Initializing flashlight service |
| `'active'` | Hardware torch is working |
| `'unsupported'` | Device doesn't have flashlight |
| `'denied'` | User denied permission |

#### 6.3.3 UI Elements

| Element | Description |
|---------|-------------|
| **Event Name** | Large bold text at top |
| **Status Circle** | 80px circular indicator with border |
| **Status Text** | Shows "🔦 FLASH ACTIVE" or "📱 SCREEN READY" |
| **Mode Label** | Small text showing current mode |
| **Background** | Black, turns white when light active |
| **Seat ID** | Subtle footer showing row-col |

---

## 7. Services & Utilities

### 7.1 syncService.ts

Real-time WebSocket communication between organizer and fans.

#### 7.1.1 Class Methods

```typescript
class SyncService {
  // Connect to WebSocket server
  connect(): void
  
  // Register as event organizer (broadcaster)
  registerAsOrganizer(eventName: string): void
  
  // Register as fan (receiver)
  registerAsFan(seat: { row: number; col: number }): void
  
  // Broadcast state to all connected fans
  broadcast(state: SyncState): void
  
  // Subscribe to state updates (returns unsubscribe function)
  subscribe(listener: SyncListener): () => void
  
  // Subscribe to fan count updates (returns unsubscribe function)
  subscribeToFanCount(listener: FanCountListener): () => void
  
  // Get last known state
  getLastState(): SyncState | null
  
  // Cleanup connections
  destroy(): void
}
```

#### 7.1.2 SyncState Interface

```typescript
interface SyncState {
  mode: string;              // Light mode
  color: string;             // Color hex
  activePixels: string[];    // Array of "row-col" strings
  globalTime: number;        // Current time
  eventName: string;         // Event name
}
```

#### 7.1.3 Server Configuration

```typescript
// Default server URL (localhost for development)
private serverUrl: string = 'http://localhost:3001';
```

---

### 7.2 flashlightService.ts

Hardware flashlight control using browser APIs.

#### 7.2.1 Class Methods

```typescript
class FlashlightService {
  // Initialize flashlight (requests permission)
  // Returns: Promise<boolean> - true if supported
  async init(): Promise<boolean>
  
  // Turn torch on or off
  async setTorch(on: boolean): Promise<void>
  
  // Stop and cleanup
  stop(): void
}
```

#### 7.2.2 Technical Details

- Uses `navigator.mediaDevices.getUserMedia()`
- Requests rear camera (`facingMode: 'environment'`)
- Uses `track.applyConstraints({ advanced: [{ torch: on }] })`
- Requires **HTTPS** for permission to work

---

## 8. User Interfaces & Flows

### 8.1 Landing Page (No Role)

When user first opens the app with no role selected.

#### UI Elements:
| Element | Description |
|---------|-------------|
| **Logo** | "L" in rounded square |
| **Title** | "LUME" in bold |
| **Subtitle** | "Stadium Light Shows" |
| **Create Room Button** | White button, main CTA |
| **Footer** | "System v1.0.4" |

#### Animations:
- Ambient gradient blobs in background (violet/cyan)
- Subtle grid pattern overlay
- Fade-in animations

---

### 8.2 Login/Event Creation Form

When user clicks "Create Room"

#### Form Fields:
| Field | Type | Placeholder | Validation |
|-------|------|-------------|-------------|
| Event Name | text | "SUPER BOWL LIX" | Required |
| Access Key | password | "Enter secure key" | Required |
| Capacity | number | "80,000" | Max 100,000 |

#### Action Buttons:
| Button | Style | Function |
|--------|-------|----------|
| Launch Environment | White bg, black text | Submit form |
| Launch Demo | Red gradient | Load demo with preset values |

---

### 8.3 Fan Seat Selection

When fan joins without pre-assigned seat

#### Form Fields:
| Field | Type | Options |
|-------|------|---------|
| Section | dropdown | Sec 101, 110, 120, 130 |
| Row | number input | 1-20 |
| Seat | number input | 1-30 |

---

### 8.4 Admin Dashboard

Main organizer view after logging in

#### Layout (Desktop):
```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo + Event Name + Menu                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │                         │  │  CONTROL PANEL      │  │
│  │   STADIUM GRID          │  │                     │  │
│  │   (Visual Preview)      │  │  [Mode Buttons]     │  │
│  │                         │  │                     │  │
│  │   32x192 seats          │  │  [Text Input]       │  │
│  │   Canvas rendered       │  │                     │  │
│  │                         │  │                     │  │
│  └─────────────────────────┘  └─────────────────────┘  │
│                                                         │
│  STATS BAR: Active Fans | Capacity | Occupancy | Tools │
└─────────────────────────────────────────────────────────┘
```

---

## 9. URL Parameters & Routing

### 9.1 Fan Join Link

When fans join via QR code or link, URL parameters are parsed:

```
?event=EVENT_NAME&section=SEC&row=ROW&seat=SEAT
```

#### Example:
```
?event=SUPERBOWL2026&section=110&row=5&seat=12
```

### 9.2 Parameter Mappings

| Parameter | Description | Example |
|-----------|-------------|---------|
| `event` | Event/match name | "SUPER BOWL LIX" |
| `section` | Section number | "101", "110", "120", "130" |
| `row` | Row number | "5" |
| `seat` | Seat number | "12" |

### 9.3 Section to Column Offset

```javascript
switch (section) {
  case '101': colOffset = 0;   // West End
  case '110': colOffset = 15;  // South Side
  case '120': colOffset = 30;  // East End
  case '130': colOffset = 45;  // North Side
  default: colOffset = 0;
}
```

### 9.4 Coordinate Calculation

```javascript
// Convert 1-based user input to 0-based internal
finalRow = rowInput - 1

// Calculate column with section offset and seat grouping
// Divide by 2 to fit more seats visually
calculatedCol = colOffset + Math.floor(seatInput / 2)
```

---

## 10. Animation & Pattern Logic

### 10.1 Global Time Ticker

```javascript
// Updates every 50ms
useEffect(() => {
  const interval = setInterval(() => {
    setGlobalTime(prev => prev + 50);
  }, 50);
  return () => clearInterval(interval);
}, []);
```

### 10.2 Mode Patterns

#### OFF Mode
```javascript
// All lights off
return false;
```

#### ON Mode
```javascript
// All lights on
return isGlobalActive;
```

#### STROBE Mode
```javascript
// Fast toggle every 100ms
return Math.floor(globalTime / 100) % 2 === 0;
```

#### PULSE Mode
```javascript
// Sinusoidal pulse
return (Math.sin(globalTime / 300) + 1) / 2 > 0.5;
```

#### WAVE Mode
```javascript
// Horizontal wave based on position
const wavePhase = (seat.col * 50) + (seat.row * 20);
const t = (globalTime - wavePhase) % 2000;
return t > 0 && t < 400;
```

#### SPARKLE Mode
```javascript
// Random flicker seeded by position
const seed = (seat.col * 13) + (seat.row * 7);
return (Math.sin(globalTime / 100 + seed) > 0.6);
```

#### TEXT Mode
```javascript
// Check if this pixel is part of scrolling text
// Uses 3x5 bitmap font
// Scrolls right to left at defined speed
```

---

## 11. QR Code & Ticket Generation

### 11.1 QR Code Generation

Uses QRServer API:
```
https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=URL&format=png
```

### 11.2 Ticket Image Generation

Canvas-based ticket with:
- QR code embedded
- Event name
- "ACTIVE SESSION" badge
- Host URL
- Branded header "LUME STADIUM SYNC"

### 11.3 Download Function

```javascript
// Creates canvas, draws ticket, triggers download
const downloadTicket = () => {
  const canvas = document.createElement('canvas');
  // ... draw ticket ...
  const link = document.createElement('a');
  link.download = `LUME-PASS-${matchName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
```

---

## 12. Socket Events Reference

### 12.1 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `register-organizer` | `string` (eventName) | Register as event organizer |
| `register-fan` | `{ seat: string }` | Register as fan with seat |
| `broadcast-state` | `SyncState` | Broadcast state to all fans |

### 12.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | - | Connected to server |
| `disconnect` | - | Disconnected from server |
| `sync-state` | `SyncState` | State update for fans |
| `fan-count` | `number` | Connected fan count for organizer |

---

## 13. Deployment & Setup

### 13.1 Prerequisites

- Node.js installed
- npm or yarn
- Gemini API key (for AI features)

### 13.2 Installation

```bash
# Navigate to project directory
cd STADIUM-BASE44

# Install dependencies
npm install
```

### 13.3 Configuration

Create `.env.local` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 13.4 Running Development Server

```bash
npm run dev
```

App runs at: `http://localhost:5173` (default Vite port)

### 13.5 Building for Production

```bash
npm run build
```

Output in: `/dist` folder

### 13.6 Production Requirements

| Requirement | Notes |
|-------------|-------|
| HTTPS | Required for flashlight access |
| Socket.io Server | For real-time sync |
| Mobile Device | For hardware flashlight |

---

## 📝 Additional Notes

### Known Limitations

1. **Flashlight requires HTTPS** - Must deploy with SSL
2. **Not all devices support torch** - Falls back to screen flash
3. **Requires mobile for hardware** - Desktop browsers can't control flashlight
4. **WebSocket server needed** - For multi-device sync

### Future Enhancements (from code comments)

- More section configurations
- Custom animation speeds
- Audio sync capabilities
- Multi-event support

---

*Documentation completed on Feb 28, 2026*
*Generated from comprehensive code analysis of STADIUM-BASE44 project*