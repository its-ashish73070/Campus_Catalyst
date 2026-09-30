/* Tiny synthesised sound kit — no audio files, nothing ever autoplays.
   Sounds only play after the visitor switches sound ON. */

let ctx: AudioContext | null = null
let enabled = false

export function setSoundEnabled(on: boolean) {
  enabled = on
  if (on && !ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (on) void ctx?.resume()
}

function noiseBurst(duration: number, gain: number, freq: number, q = 1, delay = 0) {
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const t = ctx.currentTime + delay
  const len = Math.ceil(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(f).connect(g).connect(ctx.destination)
  src.start(t)
}

export const sfx = {
  /** mechanical SLR shutter: two clacks */
  shutter() {
    if (!enabled) return
    noiseBurst(0.06, 0.5, 2400, 0.8)
    noiseBurst(0.09, 0.35, 1400, 0.9, 0.07)
  },
  /** film advance lever: a short ratchet */
  advance() {
    if (!enabled) return
    for (let i = 0; i < 6; i++) noiseBurst(0.02, 0.18, 3200, 3, i * 0.028)
  },
  click() {
    if (!enabled) return
    noiseBurst(0.025, 0.2, 4000, 2)
  },
}
