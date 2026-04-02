import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Zap, QrCode, Power,
  MonitorPlay, Mic, MicOff, Loader2, Volume2
} from 'lucide-react';
import { StadiumCanvas } from './StadiumCanvas';
import { QRModal } from './QRModal';
import { MODES } from '../utils/lightUtils';
import { syncService } from '../services/syncService';
import { startTranscription } from '../services/transcriptionService';
import { COLORS } from '../constants';
import type { LightMode, SectionTarget, EventType } from '../types';

const PRESET_COLORS = [
  '#ffffff', '#ff2d55', '#ff6b00', '#ffd700',
  '#39ff14', '#00e5ff', '#1e90ff', '#c13bff', '#ff00cc',
];

const TARGETS: SectionTarget[] = ['ALL', 'FIELD', 'STANDS', 'NORTH', 'SOUTH', 'EAST', 'WEST'];

export function OrganizerDashboard() {
  const router = useRouter();
  const hasAppliedQuery = useRef(false);
  const isDemoRef = useRef(false);
  const isDemoMode = router.query.demo === 'true';

  const [mode, setMode] = useState<LightMode>('OFF');
  const [color, setColor] = useState(COLORS.WHITE);
  const [target, setTarget] = useState<SectionTarget>('ALL');
  const [layout, setLayout] = useState<EventType>('SPORT');
  const [eventName, setEventName] = useState('LUME SHOW');
  const [draftMessage, setDraftMessage] = useState('');
  const [message, setMessage] = useState('');
  const [connectedCount, setConnectedCount] = useState(isDemoMode ? 86420 : 0);
  const [capacity, setCapacity] = useState(100000);
  const [showQR, setShowQR] = useState(false);
  const [textStartTime, setTextStartTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveTranscriptFinal, setLiveTranscriptFinal] = useState('');
  const [transcriptStatus, setTranscriptStatus] = useState('Idle');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcriptionSessionRef = useRef<{ stop: () => Promise<void> } | null>(null);

  // Track fans locally via heartbeats if no server stats
  const fanRegistry = useState<Record<string, number>>({})[0];

  useEffect(() => {
    if (isDemoMode) {
      setConnectedCount(86420);
    }
    isDemoRef.current = isDemoMode;
  }, [isDemoMode]);

  useEffect(() => {
    if (!router.isReady || hasAppliedQuery.current) return;
    const queryLayout = router.query.layout;
    const queryEvent = router.query.room || router.query.eventName;
    const queryCapacity = router.query.capacity;

    if (typeof queryLayout === 'string') {
      setLayout(queryLayout as EventType);
    }
    if (typeof queryEvent === 'string') {
      setEventName(queryEvent);
    } else if (isDemoMode) {
      setEventName('SUPER BOWL LIX');
    }
    if (typeof queryCapacity === 'string') {
      const parsed = parseInt(queryCapacity, 10);
      if (!Number.isNaN(parsed)) setCapacity(parsed);
    }

    hasAppliedQuery.current = true;
  }, [router.isReady, router.query, isDemoMode]);

  useEffect(() => {
    setMode('OFF');
    syncService.connect();

    // Stats pruning interval
    const pruneId = setInterval(() => {
      if (isDemoRef.current) return;
      const now = Date.now();
      let changed = false;
      Object.keys(fanRegistry).forEach(id => {
        if (now - fanRegistry[id] > 6000) {
          delete fanRegistry[id];
          changed = true;
        }
      });
      if (changed) setConnectedCount(Object.keys(fanRegistry).length);
    }, 5000);

    const unsub = syncService.subscribe((s: any) => {
      // NOTE: Dashboard trusts URL params for eventName/layout to avoid stale storage overwrites.

      // Handle transcript updates
      if (typeof s.transcriptPartial === 'string') {
        setLiveTranscript(s.transcriptPartial);
      }
      if (typeof s.transcript === 'string') {
        setLiveTranscriptFinal(s.transcript);
        if (!s.transcriptLive) setLiveTranscript(s.transcript);
      }

      // Handle server stats
      if (s.connectedFans !== undefined) {
        setConnectedCount(s.connectedFans);
      }
      // Handle local heartbeats
      else if (s._heartbeat && !isDemoRef.current) {
        const { deviceId, timestamp } = s._heartbeat;
        fanRegistry[deviceId] = timestamp;
        setConnectedCount(Object.keys(fanRegistry).length);
      }
    });

    return () => {
      clearInterval(pruneId);
      unsub();
      syncService.destroy();
    };
  }, []);

  useEffect(() => {
    syncService.broadcast({
      eventName, mode, color, message, target, layout, textStartTime, active: true
    });
  }, [eventName, mode, color, message, target, layout, textStartTime]);

  const handleMode = (newMode: LightMode) => {
    setMode(newMode);
    if (newMode.startsWith('TEXT')) {
      setTextStartTime(Date.now());
    }
  };

  const startLiveTranscript = async () => {
    if (isTranscribing) return;
    setIsTranscribing(true);
    setTranscriptStatus('Starting mic...');

    try {
      transcriptionSessionRef.current = await startTranscription({
        onPartial: (text) => {
          setLiveTranscript(text);
          syncService.broadcastTranscript(text, true);
        },
        onFinal: (text) => {
          setLiveTranscript(text);
          setLiveTranscriptFinal(text);
          syncService.broadcastTranscript(text, false);
        },
        onStatus: (status) => setTranscriptStatus(status),
        onError: (error) => {
          setTranscriptStatus(error);
          setIsTranscribing(false);
        }
      });
      setTranscriptStatus('Live transcription active');
    } catch (error) {
      setTranscriptStatus(error instanceof Error ? error.message : 'Failed to start transcription');
      setIsTranscribing(false);
    }
  };

  const stopLiveTranscript = async () => {
    await transcriptionSessionRef.current?.stop();
    transcriptionSessionRef.current = null;
    setIsTranscribing(false);
    setTranscriptStatus('Stopped');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 text-white font-outfit relative overflow-hidden">

      {/* Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-white/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto flex flex-col gap-8 relative z-10">

        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">LUME</h1>
            </div>

            <div className="flex items-center gap-8">
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Active Session</span>
                <span className="font-mono font-bold text-lg tracking-wider text-white/90 uppercase">{eventName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-green-500 tabular-nums">{connectedCount.toLocaleString()} FANS CONNECTED</span>
            </div>
            <button onClick={() => router.push('/')} className="w-12 h-12 bg-white/5 hover:bg-rose-500/20 text-white/20 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-all border border-white/5">
              <Power className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Main Interface Grid (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: 2 BOXES UP DOWN (Visualizer & Control Center) */}
          <div className="lg:col-span-7 flex flex-col gap-8">

            {/* BOX 1: ARENA PREVIEW */}
            <div className="relative aspect-[16/10] bg-[#141414] rounded-[3rem] border border-white/5 p-12 shadow-2xl overflow-hidden group">
              <div className="absolute top-10 left-12 flex gap-8 text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
                <span className="flex items-center gap-3"><MonitorPlay className="w-4 h-4" /> Real-time Simulation</span>
                <span>Grid: 192x32</span>
              </div>

              <div className="w-full h-full flex items-center justify-center scale-110">
                <StadiumCanvas
                  mode={mode}
                  color={color}
                  message={message}
                  target={target}
                  layout={layout}
                  textStartTime={textStartTime}
                />
              </div>
            </div>

            {/* BOX 2: CONTROL CENTER / STATS */}
            <div className="bg-[#141414] rounded-[3rem] border border-white/5 p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 grid grid-cols-3 gap-12 w-full">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: '#ffffff' }}>Terminals</p>
                  <p className="text-4xl font-black tabular-nums">{connectedCount.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: '#f7f3f3' }}>Occupancy</p>
                  <p className="text-4xl font-black text-white/40">{Math.round((connectedCount / capacity) * 100)}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: '#f8f7f7' }}>Protocol</p>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-xl font-black tracking-tighter uppercase text-white/80">Active</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowQR(true)}
                className="w-full md:w-auto flex items-center justify-center gap-4 bg-[#0011ff] text-[#ffffff] px-12 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-2xl shadow-white/10 border border-white"
              >
                <QrCode className="w-5 h-5" /> Invite Fans
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LIGHT CONTROLS */}
          <aside className="lg:col-span-5 bg-[#141414] rounded-[3rem] border border-white/5 p-8 flex flex-col gap-6 shadow-2xl sticky top-32">

            {/* Section A: Patterns */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase" style={{ color: '#ffffff', letterSpacing: '1.3px' }}>Master Patterns</h3>
                <div className="flex gap-2">
                  {['SPORT', 'CONCERT'].map(l => (
                    <button
                      key={l}
                      onClick={() => setLayout(l as EventType)}
                      className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${layout === l ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/30 hover:text-white'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MODES.filter(m => !m.id.startsWith('TEXT')).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleMode(m.id)}
                    className={`h-16 flex flex-col items-center justify-center gap-1 border transition-all rounded-2xl ${mode === m.id
                      ? 'bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)]'
                      : 'bg-white/[0.02] text-white/20 border-white/5 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="text-lg">{m.symbol}</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section B: Live Transcript */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-xs font-black uppercase" style={{ color: '#ffffff', letterSpacing: '1.7px', fontFamily: 'var(--font-jetbrains)' }}>Live Mic Transcript</h3>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40 font-black">
                  <Volume2 className="w-4 h-4" />
                  <span>{transcriptStatus}</span>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/5 bg-black/40 p-5 space-y-4">
                <p className="text-[9px] uppercase tracking-[0.35em] text-white/20 font-black">Partial transcript</p>
                <p className="min-h-[72px] text-lg md:text-xl leading-relaxed text-white/90 font-semibold">
                  {liveTranscript || 'Start transcription to capture the artist mic live.'}
                </p>
                {liveTranscriptFinal && (
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[9px] uppercase tracking-[0.35em] text-white/20 font-black mb-2">Last final line</p>
                    <p className="text-sm text-white/60 italic">{liveTranscriptFinal}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={startLiveTranscript}
                  disabled={isTranscribing}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] bg-white text-black disabled:opacity-60"
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  Start Mic Transcript
                </button>
                <button
                  onClick={stopLiveTranscript}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] bg-white/5 text-white border border-white/10"
                >
                  <MicOff className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>

            {/* Section C: Targets & Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4 border-t border-white/5">
              <div>
                <h3 className="text-xs font-black uppercase" style={{ color: '#ffffff', letterSpacing: '1.7px', fontFamily: 'var(--font-jetbrains)' }}>Target Zones</h3>
                <div className="flex flex-wrap gap-2">
                  {TARGETS.map(t => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border rounded-xl transition-all ${target === t
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.02] text-white/30 border-white/5 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase" style={{ color: '#ffffff', letterSpacing: '1.2px' }}>Global Tint</h3>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`aspect-square rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-8 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                    />
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-2">{color}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Broadcast Payload */}
            <div className="pt-4 border-t border-white/5">
              <h3 className="text-xs font-black uppercase mb-6" style={{ color: '#ffffff', letterSpacing: '1.9px', fontFamily: 'var(--font-jetbrains)' }}>BROADCAST MESSAGE...</h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value.toUpperCase())}
                  placeholder="TYPE TEXT PAYLOAD..."
                  className="bg-white/[0.02] border border-white/5 px-6 py-5 text-sm font-black text-white placeholder-white/5 uppercase focus:outline-none focus:border-white transition-all rounded-2xl"
                />
                <div className="grid grid-cols-3 gap-2">
                  {['TEXT_SCROLL', 'TEXT_FLASH', 'TEXT_STATIC'].map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        if (draftMessage) {
                          setMessage(draftMessage);
                          handleMode(m as LightMode);
                        }
                      }}
                      className={`py-5 font-black text-[9px] uppercase tracking-[0.2em] border rounded-2xl transition-all ${mode === m
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.02] text-white/30 border-white/5 hover:text-white'}`}
                    >
                      {m.replace('TEXT_', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>

      {showQR && <QRModal eventName={eventName} onClose={() => setShowQR(false)} />}
    </div>
  );
}
