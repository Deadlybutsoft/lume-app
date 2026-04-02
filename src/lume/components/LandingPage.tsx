import { useState } from 'react';
import { useRouter } from 'next/router';
import { ImageWithFallback } from './figma/ImageWithFallback';
import setupHero from '../../assets/cloudflare_setup.png';

export function LandingPage() {
  const heroSrc = typeof setupHero === 'string' ? setupHero : setupHero.src;
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);

  // Form State
  const [eventName, setEventName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [capacity, setCapacity] = useState('50000');
  const [layout, setLayout] = useState<'SPORT' | 'CONCERT'>('SPORT');

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !accessKey.trim()) {
      alert('Please enter Event Name and Access Key');
      return;
    }

    // Pass config to dashboard via URL params
    const params = new URLSearchParams();
    params.set('eventName', eventName);
    params.set('layout', layout);
    params.set('capacity', capacity);

    router.push(`/organizer?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex bg-black text-white overflow-hidden font-outfit">
      {/* Cinematic Background Image (Desktop) */}
      {showLogin && (
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden animate-fade-in-left border-r border-white/5">
          <div className="absolute inset-0 opacity-80 scale-100 animate-slow-zoom">
            <ImageWithFallback 
              src={heroSrc} 
              className="w-full h-full object-cover" 
              alt="Stadium Event Hero" 
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

          {/* Overlay Branding */}
          <div className="absolute bottom-16 left-16 z-20">
            <h1 className="text-6xl font-black tracking-tighter mb-2">LUME</h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold">The Stadium Synchronization Engine</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-col items-center justify-center p-8 md:p-16 relative transition-all duration-700 ease-in-out ${showLogin ? 'w-full lg:w-1/2' : 'w-full'}`}>

        {/* Background Ambient Accents */}
        <div className={`absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 ${showLogin ? 'lg:hidden opacity-50' : 'opacity-100'}`} />
        <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 ${showLogin ? 'hidden opacity-0' : 'opacity-100'}`} />

        <div className="w-full max-w-md relative z-10">

          {/* Logo Section (LANDING) */}
          <div className={`transition-all duration-700 ease-in-out flex flex-col items-center mb-16 ${showLogin ? 'hidden opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'}`}>
            <h1 className="text-lume-hero font-black tracking-tighter mb-6 text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.1)]">
              LUME
            </h1>
            <div className="h-[1px] w-12 bg-white/30 mb-10" />
            <p className="text-tagline-custom font-medium text-white/40 text-center leading-relaxed" style={{ fontSize: '21px', fontFamily: 'var(--font-jetbrains)' }}>
              Control thousands of phone's<br />flashlight to show iconic<br />light show on stadium stands
            </p>
          </div>

          {/* Action Buttons / View Switcher */}
          {!showLogin ? (
            <div className="space-y-6 animate-fade-in-up w-full">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full bg-white text-black font-black uppercase py-8 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-[0_20px_60px_-15px_rgba(255,255,255,0.2)]"
                style={{ fontFamily: 'var(--font-fira)', letterSpacing: '1.6px', fontSize: '37px' }}
              >
                Create Room
              </button>
            </div>
          ) : (
            <form onSubmit={handleLaunch} className="space-y-8 animate-fade-in-up w-full">
              <div className="space-y-4">
                <h2 className="font-black tracking-tighter text-white" style={{ fontSize: '62px', lineHeight: '1' }}>Event Setup</h2>
                <p className="uppercase font-bold" style={{ color: '#c7c7c7', fontSize: '12px', letterSpacing: '1.6px', fontFamily: 'var(--font-jetbrains)' }}>CONFIGURE YOUR DIGITAL ARENA</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 block mb-3">Event Name</label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value.toUpperCase())}
                    placeholder="ENTER IDENTIFIER"
                    className="w-full bg-transparent border-b-2 border-white/10 py-4 text-2xl font-medium text-white placeholder-white/5 focus:outline-none focus:border-white transition-all rounded-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 block mb-3">Layout</label>
                    <select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as any)}
                      className="w-full bg-transparent border-b-2 border-white/10 py-4 text-lg font-bold text-white focus:outline-none focus:border-white transition-all rounded-none appearance-none"
                    >
                      <option value="SPORT" className="bg-zinc-900">SPORT</option>
                      <option value="CONCERT" className="bg-zinc-900">CONCERT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 block mb-3">Capacity</label>
                    <input
                      type="number"
                      min="1000"
                      max="100000"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-white/10 py-4 text-lg font-bold text-white focus:outline-none focus:border-white transition-all rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] block mb-3" style={{ color: '#b8b8b8' }}>ADD PASSWORD...</label>
                  <input
                    type="password"
                    required
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-b-2 border-white/10 py-4 text-2xl font-medium text-white placeholder-white/5 focus:outline-none focus:border-white transition-all rounded-none"
                  />
                </div>
              </div>

              <div className="pt-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="px-8 text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all py-6 border-2 border-white/5 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white text-black font-black uppercase py-6 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
                  style={{ fontSize: '22px', letterSpacing: '1.4px', fontFamily: 'var(--font-jetbrains)' }}
                >
                  Launch Environment
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-white/10 text-[9px] font-bold uppercase tracking-[0.5em] animate-pulse">
            Protocol v1.0.4 • Core Synced
          </p>
        </div>
      </div>
    </div>
  );
}
