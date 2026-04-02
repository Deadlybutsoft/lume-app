export type LightMode =
  | 'OFF' | 'ON' | 'STROBE' | 'WAVE' | 'PULSE' | 'SPARKLE'
  | 'RAIN' | 'FLOWER' | 'STAR' | 'HEART' | 'RANDOM_BLINK' | 'BLINK'
  | 'TEXT_SCROLL' | 'TEXT_FLASH' | 'TEXT_STATIC' | 'MUSIC'
  | 'RIPPLE' | 'CHASE' | 'COUNTDOWN' | 'TWINKLE' | 'FIREWORKS'; // Keeping existing ones for compatibility during transition

export interface StadiumSeat {
  id: string;
  row: number;
  col: number;
  section: string;
}

export type SectionTarget = 'ALL' | 'FIELD' | 'STANDS' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

// Synced across tabs via SyncService
export interface EventState {
  eventName: string;
  mode: LightMode;
  color: string;       // hex, e.g. '#ff2d55'
  message: string;
  active: boolean;
  timestamp: number;
  connectedFans?: number;
  target?: SectionTarget;
  textStartTime?: number;
  layout?: 'SPORT' | 'CONCERT';
  musicIntensity?: number;
  transcript?: string;
  transcriptPartial?: string;
  transcriptUpdatedAt?: number;
  transcriptLive?: boolean;
}

export type EventType = 'SPORT' | 'CONCERT';

export interface StadiumConfig {
  rows: number;
  cols: number;
  sections: string[];
  layout: EventType;
  stageRadius?: number;
}

export enum AppRole {
  ADMIN = 'ADMIN',
  FAN = 'FAN'
}

export interface FanSeat extends StadiumSeat { }
