type TranscriptCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStatus?: (status: string) => void;
  onError?: (error: string) => void;
};

type TranscriptionSession = {
  stop: () => Promise<void>;
};

const ELEVENLABS_WS_BASE = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const TARGET_SAMPLE_RATE = 16000;

function floatTo16BitPCM(input: Float32Array) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (outputSampleRate === inputSampleRate) return buffer;

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function toBase64(uint8Array: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function startTranscription(callbacks: TranscriptCallbacks): Promise<TranscriptionSession> {
  if (typeof window === 'undefined') {
    throw new Error('Transcription can only run in the browser');
  }

  callbacks.onStatus?.('Requesting token...');
  const tokenRes = await fetch('/api/elevenlabs/token');
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || !tokenJson?.token) {
    throw new Error(tokenJson?.error || 'Failed to create ElevenLabs token');
  }

  const token = tokenJson.token as string;
  callbacks.onStatus?.('Connecting to ElevenLabs...');

  const wsUrl = new URL(ELEVENLABS_WS_BASE);
  wsUrl.searchParams.set('token', token);
  wsUrl.searchParams.set('model_id', 'scribe_v1');
  wsUrl.searchParams.set('audio_format', 'pcm_16000');
  wsUrl.searchParams.set('include_timestamps', 'true');
  wsUrl.searchParams.set('include_language_detection', 'true');

  const ws = new WebSocket(wsUrl.toString());
  ws.binaryType = 'arraybuffer';

  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let mediaStream: MediaStream | null = null;
  let stopped = false;

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;

    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: '', commit: true, sample_rate: TARGET_SAMPLE_RATE }));
      }
    } catch { /* ignore */ }

    try { processor?.disconnect(); } catch { /* ignore */ }
    try { source?.disconnect(); } catch { /* ignore */ }
    try { audioContext?.close(); } catch { /* ignore */ }
    try {
      mediaStream?.getTracks().forEach(track => track.stop());
    } catch { /* ignore */ }
    try { ws.close(); } catch { /* ignore */ }
  };

  ws.onopen = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN || stopped) return;
        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioContext?.sampleRate || 48000, TARGET_SAMPLE_RATE);
        const pcm = floatTo16BitPCM(downsampled as Float32Array);
        const base64 = toBase64(pcm);
        ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: base64,
          commit: false,
          sample_rate: TARGET_SAMPLE_RATE,
        }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      callbacks.onStatus?.('Recording...');
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Unable to access microphone');
      await cleanup();
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      const transcript = data?.text || data?.transcript || data?.partial || data?.message;
      if (data?.type === 'partial' && transcript) {
        callbacks.onPartial?.(String(transcript));
      } else if (data?.type === 'final' && transcript) {
        callbacks.onFinal?.(String(transcript));
      } else if (typeof transcript === 'string' && transcript.trim()) {
        // Fallback for event shapes from ElevenLabs
        if (data?.is_final || data?.final || data?.commit) callbacks.onFinal?.(transcript);
        else callbacks.onPartial?.(transcript);
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Failed to parse ElevenLabs event');
    }
  };

  ws.onerror = () => {
    callbacks.onError?.('ElevenLabs realtime connection error');
  };

  ws.onclose = () => {
    if (!stopped) callbacks.onStatus?.('Disconnected');
  };

  return {
    stop: cleanup,
  };
}
