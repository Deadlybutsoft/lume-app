export interface Env {
  ROOMS: DurableObjectNamespace;
}

type EventState = {
  eventName?: string;
  mode?: string;
  color?: string;
  message?: string;
  target?: string;
  layout?: string;
  textStartTime?: number;
  musicIntensity?: number;
  active?: boolean;
  timestamp?: number;
  connectedFans?: number;
  transcript?: string;
  transcriptPartial?: string;
  transcriptUpdatedAt?: number;
  transcriptLive?: boolean;
};

type ClientMessage =
  | { type: 'ADMIN_UPDATE'; payload: Partial<EventState> }
  | { type: 'ADMIN_TRANSCRIPT'; transcript: string; partial?: boolean; timestamp: number }
  | { type: 'FAN_HEARTBEAT'; deviceId: string; timestamp: number };

type ServerMessage =
  | { type: 'SYNC'; state: EventState }
  | { type: 'STATS'; fans: number };

const STORAGE_STATE_KEY = 'room:lastState';
const STORAGE_FANS_KEY = 'room:fans';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname === '/ws') {
      const room = url.searchParams.get('room') || 'default';
      const id = env.ROOMS.idFromName(room.toLowerCase());
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};

export class Room {
  private state: DurableObjectState;
  private ready: Promise<void>;
  private fans = new Map<string, number>();
  private lastState: EventState = { active: false };

  constructor(state: DurableObjectState) {
    this.state = state;
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const [savedState, savedFans] = await Promise.all([
        this.state.storage.get<EventState>(STORAGE_STATE_KEY),
        this.state.storage.get<[string, number][]>(STORAGE_FANS_KEY),
      ]);

      if (savedState) {
        this.lastState = savedState;
      }
      if (savedFans) {
        this.fans = new Map(savedFans);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    this.state.acceptWebSocket(server);
    this.send(server, { type: 'SYNC', state: this.lastState });
    this.send(server, { type: 'STATS', fans: this.fans.size });

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(_ws: WebSocket, data: string | ArrayBuffer) {
    void this.handleMessage(data);
  }

  webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.pruneFans();
    void this.persist();
    this.broadcast({ type: 'STATS', fans: this.fans.size });
  }

  webSocketError(_ws: WebSocket, _error: unknown) {
    // no-op
  }

  async alarm() {
    await this.ready;
    this.pruneFans();
    await this.persist();
    this.broadcast({ type: 'STATS', fans: this.fans.size });
  }

  private async handleMessage(data: string | ArrayBuffer) {
    await this.ready;

    let msg: ClientMessage | null = null;
    try {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (msg.type === 'ADMIN_UPDATE') {
      this.lastState = {
        ...this.lastState,
        ...msg.payload,
        timestamp: Date.now(),
      };
      await this.persist();
      this.broadcast({ type: 'SYNC', state: this.lastState });
      return;
    }

    if (msg.type === 'ADMIN_TRANSCRIPT') {
      this.lastState = {
        ...this.lastState,
        transcript: msg.partial ? this.lastState.transcript : msg.transcript,
        transcriptPartial: msg.partial ? msg.transcript : undefined,
        transcriptLive: Boolean(msg.partial),
        transcriptUpdatedAt: msg.timestamp || Date.now(),
        timestamp: Date.now(),
      };
      await this.persist();
      this.broadcast({ type: 'SYNC', state: this.lastState });
      return;
    }

    if (msg.type === 'FAN_HEARTBEAT') {
      this.fans.set(msg.deviceId, msg.timestamp || Date.now());
      this.pruneFans();
      await this.persist();
      this.state.setAlarm(Date.now() + 7000);
      this.broadcast({ type: 'STATS', fans: this.fans.size });
    }
  }

  private pruneFans() {
    const now = Date.now();
    for (const [deviceId, lastSeen] of this.fans.entries()) {
      if (now - lastSeen > 7000) {
        this.fans.delete(deviceId);
      }
    }
  }

  private broadcast(message: ServerMessage) {
    const payload = JSON.stringify(message);
    for (const socket of this.state.getWebSockets()) {
      this.safeSend(socket, payload);
    }
  }

  private send(socket: WebSocket, message: ServerMessage) {
    this.safeSend(socket, JSON.stringify(message));
  }

  private safeSend(socket: WebSocket, payload: string) {
    try {
      socket.send(payload);
    } catch {
      // ignore send failures
    }
  }

  private async persist() {
    await this.state.storage.put(STORAGE_STATE_KEY, this.lastState);
    await this.state.storage.put(STORAGE_FANS_KEY, Array.from(this.fans.entries()));
  }
}
