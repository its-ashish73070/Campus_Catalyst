/* Background music — one Audio element for the whole app.
   Lives at module level (not in React state) so re-renders, StrictMode double
   effects and section changes can never create a second player or restart it.

   Flow
   1. init(): as soon as the page opens, check the track exists, then try to
      play if the visitor hasn't muted before. Browsers block audible autoplay
      for first-time visitors — fine.
   2. On the first real user gesture (pointer / key / touch) try again.
   3. The floating control toggles on/off; the choice is saved in localStorage. */

export const MUSIC_SRC = '/audio/campus-catalyst-theme.mp3'
const TARGET_VOLUME = 0.15
const FADE_IN_MS = 2400
const FADE_OUT_MS = 900
const PREF_KEY = 'cc-music'

export type MusicStatus = 'checking' | 'unavailable' | 'paused' | 'playing'
export type MusicState = { status: MusicStatus; enabled: boolean }

const safeGet = (k: string) => {
  try { return localStorage.getItem(k) } catch { return null }
}
const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* private mode */ }
}

let state: MusicState = { status: 'checking', enabled: true }
const listeners = new Set<() => void>()
const emit = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const getState = () => state

let audio: HTMLAudioElement | null = null
let gain: GainNode | null = null
let ctx: AudioContext | null = null
let fadeRaf = 0
let started = false
let resumeOnVisible = false

/** iOS ignores HTMLMediaElement.volume, so there we fade through a GainNode. */
function volumeIsSettable(el: HTMLAudioElement) {
  el.volume = 0.5
  const ok = el.volume === 0.5
  el.volume = 1
  return ok
}

function getAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.src = MUSIC_SRC
  audio.loop = true
  audio.preload = 'none' // nothing downloads until playback is actually requested
  audio.volume = 0
  audio.addEventListener('error', () => emit({ status: 'unavailable' }))
  return audio
}

/** Only called inside a user gesture, so the AudioContext is allowed to start. */
function ensureGainRoute(el: HTMLAudioElement) {
  if (gain || volumeIsSettable(el)) return
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  ctx = new AC()
  gain = ctx.createGain()
  gain.gain.value = 0
  ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination)
}

const readLevel = () => (gain ? gain.gain.value : audio?.volume ?? 0)
const writeLevel = (v: number) => {
  const x = Math.min(1, Math.max(0, v))
  if (gain) gain.gain.value = x
  else if (audio) audio.volume = x
}

function fadeTo(target: number, ms: number) {
  cancelAnimationFrame(fadeRaf)
  const from = readLevel()
  const t0 = performance.now()
  return new Promise<void>((resolve) => {
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = p * p * (3 - 2 * p) // smoothstep
      writeLevel(from + (target - from) * eased)
      if (p < 1) fadeRaf = requestAnimationFrame(step)
      else resolve()
    }
    fadeRaf = requestAnimationFrame(step)
  })
}

async function play(fromGesture: boolean) {
  if (state.status === 'unavailable' || state.status === 'checking') return
  const el = getAudio()
  if (fromGesture) {
    ensureGainRoute(el)
    void ctx?.resume()
  }
  if (!el.paused && state.status === 'playing') return
  try {
    writeLevel(0)
    await el.play()
    started = true
    emit({ status: 'playing' })
    void fadeTo(TARGET_VOLUME, FADE_IN_MS)
  } catch {
    // Autoplay blocked (NotAllowedError) or play() interrupted by pause —
    // both expected. Stay quiet; the next gesture will try again.
    if (getState().status !== 'unavailable') emit({ status: 'paused' })
  }
}

async function pause(fade = true) {
  if (!audio || audio.paused) {
    if (state.status === 'playing') emit({ status: 'paused' })
    return
  }
  emit({ status: 'paused' })
  if (fade) await fadeTo(0, FADE_OUT_MS)
  // user may have turned it back on mid-fade
  if (state.status !== 'playing') audio.pause()
}

/** Button handler. */
export function toggleMusic() {
  if (state.enabled) {
    safeSet(PREF_KEY, 'off')
    emit({ enabled: false })
    void pause()
  } else {
    safeSet(PREF_KEY, 'on')
    emit({ enabled: true })
    void play(true)
  }
}

/* ---------- global wiring (once per page) ------------------------------ */

let initialised = false

// events that count as a user activation in current browsers
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

function onFirstGesture(e: Event) {
  // the music button handles its own click; don't double-toggle
  if ((e.target as Element | null)?.closest?.('[data-music-toggle]')) return
  if (e instanceof KeyboardEvent && (e.key === 'Escape' || e.metaKey || e.ctrlKey || e.altKey)) return
  if (state.enabled && !started) void play(true)
  if (started || !state.enabled) removeGestureListeners()
}

function removeGestureListeners() {
  GESTURES.forEach((t) => window.removeEventListener(t, onFirstGesture, true))
}

function onVisibility() {
  if (!audio) return
  if (document.hidden) {
    resumeOnVisible = state.status === 'playing'
    if (resumeOnVisible) {
      cancelAnimationFrame(fadeRaf) // rAF is frozen in background tabs
      audio.pause()
      writeLevel(0)
      emit({ status: 'paused' })
    }
  } else if (resumeOnVisible && state.enabled) {
    resumeOnVisible = false
    void play(false)
  }
}

async function trackExists() {
  try {
    const res = await fetch(MUSIC_SRC, { method: 'HEAD' })
    if (res.status === 405 || res.status === 501) return true // host doesn't do HEAD
    // dev/preview servers answer missing files with index.html, so check the type
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')
  } catch {
    return false
  }
}

export function initMusic() {
  if (initialised || typeof window === 'undefined') return
  initialised = true

  // Default music to on when the page loads, even if a previous visit stored the
  // toggle as off. The user can still switch it off afterwards from the control.
  if (safeGet(PREF_KEY) === 'off') safeSet(PREF_KEY, 'on')
  emit({ enabled: true })

  // listen for the first gesture right away — a click during the intro counts
  GESTURES.forEach((t) => window.addEventListener(t, onFirstGesture, { capture: true, passive: true }))
  document.addEventListener('visibilitychange', onVisibility)

  const boot = async () => {
    if (!(await trackExists())) {
      removeGestureListeners()
      emit({ status: 'unavailable' })
      if (import.meta.env.DEV) console.info(`[music] No track at public${MUSIC_SRC} — music control hidden.`)
      return
    }
    emit({ status: 'paused' })
    if (!state.enabled) return
    // Play immediately where the browser allows it: returning visitors with a
    // high media-engagement score, or anyone who already clicked/tapped/typed
    // while the page was loading (sticky user activation).
    const nav = navigator as Navigator & { getAutoplayPolicy?: (t: 'mediaelement') => string }
    const clicked = nav.userActivation?.hasBeenActive ?? false
    if (clicked || nav.getAutoplayPolicy?.('mediaelement') !== 'disallowed') void play(clicked)
  }

  // start as soon as the document is parsed; the track itself streams (preload
  // is 'none' until play), so this costs one tiny HEAD request
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void boot(), { once: true })
  else void boot()
}
