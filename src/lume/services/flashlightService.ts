/**
 * LUME Flashlight Service
 *
 * Strategy:
 *  - Android  → try hardware torch via MediaStream camera API
 *  - iOS / other → immediately use screen-flash mode (iOS blocks torch in browsers)
 *  - Denied / error → fall back to screen-flash gracefully
 */

export type FlashlightMode = 'torch' | 'screen' | 'denied' | 'idle';

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /ipad|iphone|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export class FlashlightService {
  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  public hasTorch: boolean = false;
  public mode: FlashlightMode = 'idle';

  async init(): Promise<FlashlightMode> {
    // iOS: torch is not accessible via browser APIs at all — use screen
    if (isIOS()) {
      console.log('[LUME] iOS detected → screen-flash mode');
      this.mode = 'screen';
      return 'screen';
    }

    // Non-mobile / unknown desktop fallback
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[LUME] getUserMedia unavailable → screen-flash mode');
      this.mode = 'screen';
      return 'screen';
    }

    // Android (or unknown mobile): attempt hardware torch
    try {
      if (this.stream) this.stop();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          // Hint to browser we want the rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });

      this.track = this.stream.getVideoTracks()[0];
      if (!this.track) {
        console.warn('[LUME] No video track → screen-flash mode');
        this.stop();
        this.mode = 'screen';
        return 'screen';
      }

      // Android devices are often slow to report torch capability — retry up to ~1 s
      for (let i = 0; i < 6; i++) {
        const caps = (this.track.getCapabilities() as Record<string, unknown>) ?? {};
        if (caps['torch'] === true) {
          this.hasTorch = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 180));
      }

      if (this.hasTorch) {
        // Verify by actually applying torch:on — some devices report capability but fail silently
        try {
          await this.track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
          await this.track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
          console.log('[LUME] Android hardware torch confirmed → torch mode');
          this.mode = 'torch';
          return 'torch';
        } catch {
          // applyConstraints failed — fall through to screen mode
          this.hasTorch = false;
        }
      }

      // Android but no torch — clean up camera stream and use screen
      console.log('[LUME] Android without torch → screen-flash mode');
      this.stop();
      this.mode = 'screen';
      return 'screen';

    } catch (err: unknown) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        console.warn('[LUME] Camera permission denied');
        this.mode = 'denied';
        return 'denied';
      }
      // Any other error → graceful screen fallback
      console.warn('[LUME] Camera error, falling back to screen:', err);
      this.stop();
      this.mode = 'screen';
      return 'screen';
    }
  }

  async setTorch(on: boolean): Promise<void> {
    if (!this.track || !this.hasTorch) return;
    try {
      await this.track.applyConstraints({
        advanced: [{ torch: on } as MediaTrackConstraintSet]
      });
    } catch (err) {
      console.warn('[LUME] torch applyConstraints failed:', err);
    }
  }

  stop(): void {
    try {
      if (this.track) { this.track.stop(); this.track = null; }
      if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    } catch { /* ignore */ }
    this.hasTorch = false;
  }
}

export const flashlightService = new FlashlightService();
