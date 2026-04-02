import { X, Copy, Download, Check, Share2, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QRModalProps {
  eventName: string;
  onClose: () => void;
}

export function QRModal({ eventName, onClose }: QRModalProps) {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);
  const fanUrl = `${baseUrl}/fan?room=${encodeURIComponent(eventName)}&event=${encodeURIComponent(eventName)}`;
  // Using a cleaner QR generator with LUME branding colors
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fanUrl)}&bgcolor=000000&color=ffffff&format=png&margin=20`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fanUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!baseUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 font-outfit">

      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 w-full max-w-2xl relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/5 z-20 group"
        >
          <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
        </button>

        {/* Content */}
        <div className="relative z-10">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2" style={{ letterSpacing: '3.8px' }}>LINK FOR FANS...</h2>
            <p className="text-white/40 text-sm font-medium tracking-wide">Scan or copy the lin...</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center">

            {/* QR Code Area */}
            <div className="w-full lg:w-1/2 bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative group">
              <img
                src={qrUrl}
                alt="Participation QR"
                className="w-full aspect-square object-contain transition-transform group-hover:scale-[0.98]"
              />
              <div className="absolute inset-0 border-2 border-black/5 rounded-[2rem] pointer-events-none" />
            </div>

            {/* Sharing Options */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4">

              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4 flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" /> Quick Access Link
                </p>
                <div className="bg-black py-3 px-4 rounded-xl border border-white/5 mb-4">
                  <p className="text-[11px] font-mono text-white/40 truncate">{fanUrl}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link Copied' : 'Copy Link'}
                </button>
                <button
                  onClick={() => window.open(fanUrl, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-white/20 active:scale-95 mt-4 border border-white/10"
                >
                  <ExternalLink className="w-4 h-4" /> Visit Link
                </button>
              </div>

            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Live</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">LUME v1.0.4</p>
          </div>

        </div>

      </div>
    </div>
  );
}
