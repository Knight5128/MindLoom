import type { AmbientId } from "../store/useUiStore";

/**
 * 程序化环境音：完全 Web Audio 合成，无需任何外部音频资源。
 *  - rain  : 带通滤波白噪 + 随机滴答
 *  - wind  : 低通滤波白噪 + 慢速增益调制
 *  - white : 柔化白噪
 *  - bowl  : 缓慢的钵音呼吸（每 ~14s 一次）
 *
 * 主增益 1.5s 淡入 / 淡出，避免突兀切换。
 */
class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private currentNodes: AudioNode[] = [];
  private currentId: AmbientId = null;
  private bowlTimer: ReturnType<typeof setInterval> | null = null;
  private targetVolume = 0.5;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number) {
    this.targetVolume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx && this.currentId) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, this.ctx.currentTime + 0.3);
    }
  }

  fadeToSilence(seconds: number) {
    if (!this.master || !this.ctx || !this.currentId) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + Math.max(0, seconds));
  }

  async play(id: AmbientId) {
    if (id === this.currentId) return;
    this.ensureCtx();
    await this.fadeOutAndStop();
    this.currentId = id;
    if (id === null) return;
    this.startSource(id);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, this.ctx.currentTime + 1.5);
    }
  }

  private async fadeOutAndStop(): Promise<void> {
    if (!this.master || !this.ctx || this.currentNodes.length === 0) {
      this.cleanupNodes();
      return;
    }
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    await new Promise((r) => setTimeout(r, 1250));
    this.cleanupNodes();
  }

  private cleanupNodes() {
    if (this.bowlTimer) {
      clearInterval(this.bowlTimer);
      this.bowlTimer = null;
    }
    for (const n of this.currentNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* ignore */
      }
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.currentNodes = [];
  }

  private startSource(id: Exclude<AmbientId, null>) {
    const ctx = this.ctx!;
    const out = this.master!;
    switch (id) {
      case "rain":
        this.startRain(ctx, out);
        break;
      case "wind":
        this.startWind(ctx, out);
        break;
      case "white":
        this.startWhite(ctx, out);
        break;
      case "bowl":
        this.startBowl(ctx, out);
        break;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startRain(ctx: AudioContext, out: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 6);
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.value = 0.55;
    noise.connect(bp).connect(hp).connect(g).connect(out);
    noise.start();
    this.currentNodes.push(noise, bp, hp, g);
  }

  private startWind(ctx: AudioContext, out: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 6);
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    lp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;
    lfo.connect(lfoGain).connect(g.gain);
    noise.connect(lp).connect(g).connect(out);
    noise.start();
    lfo.start();
    this.currentNodes.push(noise, lp, g, lfo, lfoGain);
  }

  private startWhite(ctx: AudioContext, out: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 6);
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4000;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    noise.connect(lp).connect(g).connect(out);
    noise.start();
    this.currentNodes.push(noise, lp, g);
  }

  private startBowl(ctx: AudioContext, out: GainNode) {
    const g = ctx.createGain();
    g.gain.value = 0.5;
    g.connect(out);
    this.currentNodes.push(g);
    const strike = () => {
      if (!this.ctx || this.currentId !== "bowl") return;
      const t0 = ctx.currentTime;
      const partials = [
        { f: 220, a: 0.5, d: 6 },
        { f: 330, a: 0.3, d: 4.5 },
        { f: 660, a: 0.15, d: 3 },
        { f: 880, a: 0.08, d: 2 },
      ];
      for (const p of partials) {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.frequency.value = p.f;
        o.type = "sine";
        og.gain.setValueAtTime(0, t0);
        og.gain.linearRampToValueAtTime(p.a, t0 + 0.05);
        og.gain.exponentialRampToValueAtTime(0.0001, t0 + p.d);
        o.connect(og).connect(g);
        o.start(t0);
        o.stop(t0 + p.d + 0.1);
      }
    };
    strike();
    this.bowlTimer = setInterval(strike, 14000);
  }
}

export const ambientPlayer = new AmbientPlayer();
