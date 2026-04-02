import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { flashlightService, type FlashlightMode } from '../services/flashlightService';
import { syncService } from '../services/syncService';
import { isPixelActive } from '../utils/lightUtils';
import { EVENT_CONFIGS } from '../constants';
import type { EventState, FanSeat } from '../types';

export function FanView() {
  const router = useRouter();
  const eventQueryRef = useRef<string | undefined>(undefined);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLightOn, setIsLightOn] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashlightMode>('idle');
  const [localTime, setLocalTime] = useState(Date.now());
  const [seat, setSeat] = useState<FanSeat | null>(null);
  // Track last torch state to avoid redundant applyConstraints calls
  const lastTorchRef = useRef<boolean | null>(null);

  // ── Sync with Global State ──
  useEffect(() => {
    syncService.connect();

    const heartbeatId = setInterval(() => {
      syncService.notifyPresence();
    }, 2000);

    const unsub = syncService.subscribe((s) => {
      setEventState(prev => {
        const urlName = eventQueryRef.current;
        return {
          ...prev,
          ...s,
          eventName: decodeURIComponent(urlName || '') || s.eventName || prev?.eventName || 'LUME SHOW'
        } as EventState;
      });
    });

    return () => {
      clearInterval(heartbeatId);
      unsub();
      syncService.destroy();
      // Release camera on unmount
      flashlightService.stop();
    };
  }, []);

  useEffect(() => {
    const urlEvent = typeof router.query.room === 'string'
      ? router.query.room
      : typeof router.query.event === 'string'
        ? router.query.event
        : undefined;
    eventQueryRef.current = urlEvent;

    if (urlEvent) {
      setEventState(prev => ({
        ...(prev || { mode: 'OFF', color: '#FFFFFF', active: false }),
        eventName: decodeURIComponent(urlEvent)
      } as EventState));
    }

    if (typeof router.query.seatId === 'string') {
      setIsJoined(true);
    }
  }, [router.query.event, router.query.seatId]);

  // ── Animation Loop ──
  useEffect(() => {
    const id = setInterval(() => setLocalTime(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  // ── Seat Assignment Logic ──
  useEffect(() => {
    if (!eventState) return;

    const seatIdParam = typeof router.query.seatId === 'string' ? router.query.seatId : undefined;
    if (!seatIdParam) return;

    const capacity = 100000;
    const { rows, cols } = EVENT_CONFIGS[eventState.layout || 'SPORT'];
    const isConcert = eventState.layout === 'CONCERT';
    const fieldRows = isConcert ? 16 : 0;

    const validSeats: { r: number, c: number, section: string }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let isValid = true;
        if (isConcert && r < fieldRows) {
          const startX = -120, endX = 120, startY = -60, endY = 60;
          const x = startX + (c / (cols - 1)) * (endX - startX);
          const y = startY + (r / (fieldRows - 1)) * (endY - startY);
          if (Math.sqrt(x * x + y * y) <= 25) isValid = false;
        }
        if (isValid) {
          let section = 'South End';
          const straight = Math.floor(cols / 6);
          const curve = Math.floor(cols / 3);
          if (isConcert && r < fieldRows) section = 'Field';
          else if (c < straight) section = 'East Stand';
          else if (c < straight + curve) section = 'North End';
          else if (c < (straight * 2) + curve) section = 'West Stand';
          validSeats.push({ r, c, section });
        }
      }
    }

    const seatId = parseInt(seatIdParam);
    const normalizedIndex = Math.floor(((seatId - 1) / capacity) * validSeats.length);
    const index = Math.min(normalizedIndex, validSeats.length - 1);
    const mappedSeat = validSeats[index];

    setSeat({
      id: seatId.toString(),
      row: mappedSeat.r,
      col: mappedSeat.c,
      section: mappedSeat.section
    });
  }, [eventState?.layout, router.query.seatId]);

  // ── Active Calculation ──
  const calculateIsActive = useCallback(() => {
    if (!eventState || !seat || !eventState.active) return false;
    const { rows, cols } = EVENT_CONFIGS[eventState.layout || 'SPORT'];
    return isPixelActive(
      seat.row,
      seat.col,
      rows,
      cols,
      eventState.mode,
      localTime,
      eventState.target || 'ALL',
      eventState.message,
      eventState.textStartTime || 0,
      eventState.musicIntensity || 0
    );
  }, [eventState, seat, localTime]);

  // ── Drive Torch / Screen Flash ──
  useEffect(() => {
    const active = calculateIsActive();

    if (active !== isLightOn) {
      setIsLightOn(active);

      // Only fire hardware torch calls on Android with confirmed torch mode
      if (flashMode === 'torch' && lastTorchRef.current !== active) {
        lastTorchRef.current = active;
        flashlightService.setTorch(active).catch(() => { });
      }
    }
  }, [calculateIsActive, isLightOn, flashMode]);

  // ── Join Handler ──
  const handleJoin = async () => {
    const mode = await flashlightService.init();
    setFlashMode(mode);
    setIsJoined(true);
  };

  const transcriptText = eventState?.transcriptPartial || eventState?.transcript || '';

  // ── Pre-join screen ──
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 font-outfit relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/[0.05] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-sm z-10 text-center space-y-12 animate-fade-in-up">
          <div className="space-y-4">
            <h1 className="font-black tracking-tighter uppercase" style={{ fontSize: '50px' }}>
              {eventState?.eventName || 'JOIN SHOW'}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold">
              Protocol Synchronization Ready
            </p>
          </div>

          <p className="leading-relaxed font-medium" style={{ fontSize: '23px', color: '#e6e6e6', fontFamily: 'var(--font-jetbrains)' }}>
            Join thousands of others in the synchronized stadium light display.
            {' '}Android devices use the hardware flashlight; iOS and other devices use the screen.
          </p>

          <button
            onClick={handleJoin}
            className="w-full py-6 bg-white text-black font-black uppercase hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
            style={{ letterSpacing: '1.1px', fontSize: '23px', fontFamily: 'var(--font-jetbrains)' }}
          >
            JOIN   ROOM...
          </button>

          <div className="pt-8">
            <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-bold">
              Powered by LUME • SST-SYNC PROTOCOL
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Seat selection screen ──
  const seatIdParam = typeof router.query.seatId === 'string' ? router.query.seatId : undefined;
  if (!seatIdParam) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 font-outfit relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/[0.05] rounded-full blur-[100px] pointer-events-none" />

        {/* Camera permission denied warning */}
        {flashMode === 'denied' && (
          <div className="absolute top-6 left-4 right-4 z-20">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                Camera Access Denied · Using Screen Flash
              </p>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm relative z-10 space-y-12 animate-fade-in-up">
          <div className="text-center space-y-4">
            <h1 className="font-black uppercase tracking-tighter" style={{ fontSize: '50px' }}>
              {eventState?.eventName || 'JOIN SHOW'}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
              Enter your seat number to begin
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const sId = formData.get('seatId')?.toString();
            if (sId) {
              router.replace(
                {
                  pathname: router.pathname,
                  query: { ...router.query, seatId: sId }
                },
                undefined,
                { shallow: true }
              );
            }
          }} className="space-y-10">
            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 block text-center">
                Pixel / Seat ID
              </label>
              <input
                name="seatId"
                type="number"
                placeholder="000"
                className="w-full bg-transparent border-b-2 border-white/10 py-6 text-7xl font-black text-white placeholder-white/5 focus:outline-none focus:border-white transition-all rounded-none text-center tracking-tighter"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-5 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/10"
            >
              Synchronize Device
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Active light show view ──

  // Screen-flash: full brightness when light is on
  const isScreenMode = flashMode === 'screen' || flashMode === 'denied';
  const bgColor = isLightOn ? (eventState?.color || '#FFFFFF') : '#000000';

  // For screen mode we add extra brightness via CSS filter
  const screenStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    // Maximise perceived brightness on screen mode
    ...(isScreenMode && isLightOn ? { filter: 'brightness(1.15) saturate(1.1)' } : {}),
  };

  const isTorchMode = flashMode === 'torch';

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        ...screenStyle,
        // Torch mode: keep screen black, hardware flash does the work
        // Screen mode: full-color flash fills the viewport
        transition: isScreenMode ? 'background-color 60ms linear' : 'none',
      }}
    >
      {/* Status badge */}
      <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
        <div
          className={`px-4 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-opacity duration-300 ${
            isLightOn && isScreenMode ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: isTorchMode ? '#22c55e' : flashMode === 'denied' ? '#f59e0b' : '#3b82f6' }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            {isTorchMode
              ? 'Hardware Torch Active'
              : flashMode === 'denied'
              ? 'Screen Flash (Camera Denied)'
              : 'Screen Flash Active'}
          </span>
        </div>
      </div>

      {/* Waiting state */}
      {!isLightOn && (
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10 animate-pulse">
            Awaiting Pulse Signal...
          </p>
        </div>
      )}

      {/* Active light state overlay text */}
      {isLightOn && (
        <div className="text-center mix-blend-difference pointer-events-none">
          <p className="text-4xl font-black text-white/20 uppercase tracking-[0.5em]">LUME</p>
        </div>
      )}

      {/* Torch mode hint overlay — shows the color as a dim ring so user knows it's working */}
      {isTorchMode && isLightOn && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${eventState?.color || '#ffffff'}15 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="absolute bottom-10 left-0 right-0 text-center opacity-10 pointer-events-none">
        <p className="text-[8px] font-black uppercase tracking-[0.8em] text-white">
          SYNC_PROTOCOL_ESTABLISHED
        </p>
      </div>
    </div>
  );
}
