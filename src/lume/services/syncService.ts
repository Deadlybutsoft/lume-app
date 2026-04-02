import type { EventState } from '../types';

/**
 * SyncService — real-time cross-tab sync via BroadcastChannel (same device/browser)
 * Enhanced to support WebSocket events for remote synchronization and fan tracking.
 */

const CHANNEL_NAME = 'lume-stadium-v2';
const STORAGE_KEY = 'lume-event-v2';

type StateListener = (state: EventState) => void;

class SyncService {
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private listeners = new Set<StateListener>();
  private lastState: EventState | null = null;
  private deviceId = Math.random().toString(36).substring(7);
  private room = 'default';
  private pendingRemoteMessages: string[] = [];

  connect() {
    // Local cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!this.channel) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e: MessageEvent<any>) => {
          if (e.data?.type === 'FAN_HEARTBEAT') {
            // Dashboard handles this
            this.notifyListenersOfStats(e.data);
          } else {
            this.notify(e.data);
          }
        };
      }
    }

    // Remote multi-device sync (WebSocket)
    const protocol =
      process.env.NEXT_PUBLIC_WS_PROTOCOL ||
      (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
    this.room = this.getRoomFromLocation();

    try {
      this.ws = new WebSocket(`${protocol}//${host}/ws?room=${encodeURIComponent(this.room)}`);

      this.ws.onopen = () => {
        // Always rehydrate the room with the latest local state when a connection comes up.
        if (this.lastState) {
          this.sendRemote({ type: 'ADMIN_UPDATE', payload: this.lastState });
        }
        while (this.pendingRemoteMessages.length && this.ws?.readyState === WebSocket.OPEN) {
          const msg = this.pendingRemoteMessages.shift();
          if (msg) this.ws.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC') {
            this.notify(data.state);
          } else if (data.type === 'STATS') {
            this.notifyListenersOfStats(data);
          }
        } catch (e) {
          console.error('Error parsing sync message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected, retrying in 2s...');
        setTimeout(() => this.connect(), 2000);
      };
    } catch (err) {
      console.warn('WebSocket connection failed, relying on local sync.');
    }
  }

  private getRoomFromLocation(): string {
    try {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const eventName = params.get('event') || params.get('eventName');
      if (room) return room;
      if (eventName) return eventName;
    } catch {
      // ignore
    }
    return 'default';
  }

  // Fans call this to announce presence
  notifyPresence() {
    const payload = { type: 'FAN_HEARTBEAT', deviceId: this.deviceId, timestamp: Date.now() };
    this.sendLocal(payload);
    this.sendRemote(payload);
  }

  broadcast(state: Partial<EventState>) {
    const full: EventState = {
      ...this.getLastState()!,
      ...state,
      timestamp: Date.now()
    } as EventState;

    this.lastState = full;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));

    // Notify locally (BroadcastChannel)
    this.sendLocal(full);

    // Notify remote server
    this.sendRemote({ type: 'ADMIN_UPDATE', payload: state });
  }

  broadcastTranscript(transcript: string, partial = false) {
    const nextState: Partial<EventState> = {
      transcript: partial ? this.lastState?.transcript : transcript,
      transcriptPartial: partial ? transcript : undefined,
      transcriptLive: partial,
      transcriptUpdatedAt: Date.now(),
      timestamp: Date.now(),
    };

    const full: EventState = {
      ...this.getLastState()!,
      ...nextState,
    } as EventState;

    this.lastState = full;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));

    this.sendLocal(full);

    this.sendRemote({
      type: 'ADMIN_TRANSCRIPT',
      transcript,
      partial,
      timestamp: Date.now(),
    });
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    const state = this.getLastState();
    if (state) listener(state);
    return () => this.listeners.delete(listener);
  }

  getLastState(): EventState | null {
    if (this.lastState) return this.lastState;
    const raw = localStorage.getItem(STORAGE_KEY);
    try {
      if (raw) {
        this.lastState = JSON.parse(raw) as EventState;
        return this.lastState;
      }
    } catch { /* ignore */ }
    return null;
  }

  destroy() {
    this.channel?.close();
    this.ws?.close();
    this.listeners.clear();
  }

  private sendLocal(payload: any) {
    try {
      if (this.channel && this.channel.name) {
        this.channel.postMessage(payload);
      }
    } catch {
      try { this.channel?.close(); } catch { /* ignore */ }
      this.channel = null;
    }
  }

  private sendRemote(message: Record<string, any>) {
    const payload = JSON.stringify(message);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.pendingRemoteMessages.push(payload);
    }
  }

  private notify(state: EventState) {
    if (!state || (state as any).type === 'FAN_HEARTBEAT') return;
    this.lastState = state;
    this.listeners.forEach(l => l(state));
  }

  private notifyListenersOfStats(data: any) {
    // We reuse the EventState listeners but pass a modified state containing only connectedFans 
    // or we could add a dedicated stats listener. 
    // To keep it simple, we'll trigger a refresh.
    if (data.fans !== undefined) {
      this.notify({ ...this.lastState, connectedFans: data.fans } as EventState);
    } else if (data.type === 'FAN_HEARTBEAT') {
      // This will be handled by the specialized logic in OrganizerDashboard
      this.listeners.forEach(l => l({ ...this.lastState, _heartbeat: data } as any));
    }
  }
}

export const syncService = new SyncService();
