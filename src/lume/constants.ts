export const STADIUM_CONFIG = {
  DEFAULT_ROWS: 32,
  DEFAULT_COLS: 192,
  SECTION_NAMES: ['East Stand', 'North End', 'West Stand', 'South End'],
  ANIMATION_SPEED: 100,
};

export const EVENT_CONFIGS = {
  SPORT: {
    rows: 32,
    cols: 192,
    sections: ['East Stand', 'North End', 'West Stand', 'South End'],
    layout: 'SPORT' as const
  },
  CONCERT: {
    rows: 48, // Taller grid to accommodate field
    cols: 192,
    sections: ['East Stand', 'North End', 'West Stand', 'South End', 'Field'],
    layout: 'CONCERT' as const,
    stageRadius: 12, // Radius of empty center
  }
};

export const COLORS = {
  PRIMARY: '#3b82f6', // Blue
  SECONDARY: '#ec4899', // Pink
  SUCCESS: '#22c55e', // Green
  WARNING: '#eab308', // Yellow
  WHITE: '#ffffff',
  BLACK: '#000000',
  FIELD: '#15803d', // Field Green
};

// 3x5 Bitmap Font for Stadium Text
// Format: Array of 5 integers, where each integer represents a 3-bit row (0-7)
export const FONT_3X5: Record<string, number[]> = {
  'A': [2, 5, 7, 5, 5], 'B': [6, 5, 6, 5, 6], 'C': [7, 4, 4, 4, 7], 'D': [6, 5, 5, 5, 6],
  'E': [7, 4, 6, 4, 7], 'F': [7, 4, 6, 4, 4], 'G': [3, 4, 5, 5, 3], 'H': [5, 5, 7, 5, 5],
  'I': [7, 2, 2, 2, 7], 'J': [1, 1, 1, 5, 2], 'K': [5, 5, 6, 5, 5], 'L': [4, 4, 4, 4, 7],
  'M': [5, 7, 5, 5, 5], 'N': [6, 5, 5, 5, 5], 'O': [2, 5, 5, 5, 2], 'P': [6, 5, 6, 4, 4],
  'Q': [2, 5, 5, 6, 3], 'R': [6, 5, 6, 5, 5], 'S': [3, 4, 2, 1, 6], 'T': [7, 2, 2, 2, 2],
  'U': [5, 5, 5, 5, 7], 'V': [5, 5, 5, 5, 2], 'W': [5, 5, 5, 7, 5], 'X': [5, 5, 2, 5, 5],
  'Y': [5, 5, 2, 2, 2], 'Z': [7, 1, 2, 4, 7],
  '0': [2, 5, 5, 5, 2], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 6, 5, 2], '7': [7, 1, 2, 4, 4],
  '8': [2, 5, 2, 5, 2], '9': [2, 5, 7, 1, 2], ' ': [0, 0, 0, 0, 0],
  '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2], '?': [2, 5, 1, 0, 2]
};

// Keeping these for now to avoid immediate breakage
export const SECTIONS = ['North End', 'East Stand', 'South End', 'West Stand'] as const;
export type Section = typeof SECTIONS[number];
export const SECTION_ANGLE_CENTER: Record<Section, number> = {
  'North End': -Math.PI / 2,
  'East Stand': 0,
  'South End': Math.PI / 2,
  'West Stand': Math.PI,
};
