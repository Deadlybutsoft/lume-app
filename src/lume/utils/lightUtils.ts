import { FONT_3X5, STADIUM_CONFIG } from '../constants';
import { LightMode, SectionTarget } from '../types';

export interface ModeConfig {
  id: LightMode;
  label: string;
  description: string;
  symbol: string;
}

export const MODES: ModeConfig[] = [
  { id: 'OFF', label: 'OFF', description: 'Lights off', symbol: '○' },
  { id: 'ON', label: 'ON', description: 'All lights on', symbol: '●' },
  { id: 'STROBE', label: 'STROBE', description: 'Rapid flash', symbol: '≋' },
  { id: 'PULSE', label: 'PULSE', description: 'Breathing pulse', symbol: '◈' },
  { id: 'WAVE', label: 'WAVE', description: 'Linear wave', symbol: '∿' },
  { id: 'SPARKLE', label: 'SPARKLE', description: 'Random sparkle', symbol: '✦' },
  { id: 'RAIN', label: 'RAIN', description: 'Falling rain', symbol: '🌧' },
  { id: 'STAR', label: 'STAR', description: 'Twinkling stars', symbol: '★' },
  { id: 'FLOWER', label: 'FLOWER', description: 'Blooming petals', symbol: '❀' },
  { id: 'RANDOM_BLINK', label: 'RANDOM', description: 'Chaotic blink', symbol: '❈' },
  { id: 'BLINK', label: 'BLINK', description: 'Slow blink', symbol: '◒' },
  { id: 'HEART', label: 'HEART', description: 'Pulsing hearts', symbol: '♥' },
  { id: 'TEXT_SCROLL', label: 'TEXT', description: 'Scrolling message', symbol: 'T' },
];

/**
 * Core Synchronization Logic
 * Returns true if a specific pixel at [row, col] should be illuminated 
 */
export function isPixelActive(
  r: number,
  c: number,
  rows: number,
  cols: number,
  mode: LightMode,
  time: number,
  target: SectionTarget = 'ALL',
  message: string = '',
  textStartTime: number = 0,
  musicIntensity: number = 0
): boolean {
  // 1. Target Filtering
  if (target !== 'ALL') {
    let section = 'South End';
    const straight = Math.floor(cols / 6);
    const curve = Math.floor(cols / 3);

    // Check for Field (Concert Mode)
    if (r < 16 && rows >= 48) { // Simplified field check
      section = 'Field';
    } else {
      if (c < straight) section = 'East Stand';
      else if (c < straight + curve) section = 'North End';
      else if (c < (straight * 2) + curve) section = 'West Stand';
    }

    if (target === 'NORTH' && section !== 'North End') return false;
    if (target === 'SOUTH' && section !== 'South End') return false;
    if (target === 'EAST' && section !== 'East Stand') return false;
    if (target === 'WEST' && section !== 'West Stand') return false;
    if (target === 'FIELD' && section !== 'Field') return false;
    if (target === 'STANDS' && section === 'Field') return false;
  }

  // 2. Pattern Logic
  switch (mode) {
    case 'OFF': return false;
    case 'ON': return true;
    case 'STROBE': return Math.floor(time / 100) % 2 === 0;
    case 'BLINK': return Math.floor(time / 500) % 2 === 0;
    case 'PULSE': return (Math.sin(time / 300) + 1) / 2 > 0.5;

    case 'WAVE': {
      const wavePhase = (c * 50) + (r * 20);
      const t = (time - wavePhase) % 2000;
      return t > 0 && t < 400;
    }

    case 'SPARKLE': {
      const seed = (c * 13) + (r * 7);
      return Math.sin(time / 100 + seed) > 0.6;
    }

    case 'RAIN': {
      const dropPosition = Math.floor((time / 80 + c * 2) % 20);
      return r >= dropPosition - 2 && r <= dropPosition;
    }

    case 'FLOWER': {
      const seed = r + c;
      const bloomPhase = (Math.sin(time / 500 + seed * 0.3) + 1) / 2;
      return bloomPhase > 0.5 && seed % 3 === 0;
    }

    case 'STAR': {
      const seed = r * 11 + c * 7;
      const twinkle = Math.sin(time / 150 + seed);
      return twinkle > 0.6 || (twinkle > 0.2 && seed % 2 === 0);
    }

    case 'RANDOM_BLINK': {
      const seed = r * 13 + c * 7;
      return Math.sin(time / 200 + seed) > 0.7;
    }

    case 'HEART': {
      const seed = r % 5;
      const beat = Math.sin(time / 400 + seed);
      return beat > 0.3 && c % 5 === seed;
    }

    case 'MUSIC': return musicIntensity > 0.5;

    case 'TEXT_SCROLL':
    case 'TEXT_FLASH':
    case 'TEXT_STATIC': {
      if (!message) return false;

      const SCALE = 4;
      const CHAR_BASE_W = 3;
      const CHAR_W = CHAR_BASE_W * SCALE;
      const SPACING = 1 * SCALE;
      const MSG_UNIT = CHAR_W + SPACING;
      const textHeight = 5 * SCALE;
      const startR = Math.floor((rows - textHeight) / 2);

      let offset = 0;
      let showText = true;

      if (mode === 'TEXT_SCROLL') {
        const speed = 80;
        const elapsed = time - textStartTime;
        offset = Math.floor(elapsed / speed);
        if (offset >= cols + (message.length * MSG_UNIT)) showText = false;
      } else if (mode === 'TEXT_FLASH') {
        if (Math.floor(time / 500) % 2 !== 0) showText = false;
        offset = (cols + message.length * MSG_UNIT) / 2;
      } else {
        offset = (cols + message.length * MSG_UNIT) / 2;
      }

      if (!showText) return false;

      const messageX = c - cols + offset;
      if (messageX < 0) return false;

      const charIndex = Math.floor(messageX / MSG_UNIT);
      const colInUnit = messageX % MSG_UNIT;

      if (charIndex < message.length && colInUnit < CHAR_W) {
        const char = message[charIndex].toUpperCase();
        const glyph = FONT_3X5[char] || FONT_3X5[' '];
        if (glyph) {
          const colInChar = Math.floor(colInUnit / SCALE);
          const mask = 1 << (2 - colInChar);
          const gridR = r - startR;
          if (gridR >= 0 && gridR < textHeight) {
            const rowInChar = Math.floor((textHeight - 1 - gridR) / SCALE);
            return (rowInChar >= 0 && rowInChar < 5 && (glyph[rowInChar] & mask)) !== 0;
          }
        }
      }
      return false;
    }

    default: return false;
  }
}

