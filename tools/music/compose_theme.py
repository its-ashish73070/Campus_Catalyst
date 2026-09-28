"""Campus Catalyst 2K26 — 80s Indian disco loop (original).
A minor, 118 BPM, 32 bars: groove → hook → brass → tabla break → build → loop."""
import numpy as np, wave

SR = 44100
BPM = 118
BEAT = 60 / BPM
BAR = 4 * BEAT
E8, E16 = BEAT / 2, BEAT / 4
BARS = 32
L = BARS * BAR
N = int(round(L * SR))
TAIL = int(4 * SR)
rng = np.random.default_rng(1982)
out = np.zeros((2, N + TAIL))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

# gentle tape wow, periodic over the loop
t_all = np.arange(N + TAIL) / SR
r = 4 / L
TW = t_all - 0.0009 / (2 * np.pi * r) * np.cos(2 * np.pi * r * t_all)


def place(sig, start, pan=0.0, gain=1.0):
    i = int(round(start * SR)) % N  # wrap anything past the loop end
    n = min(len(sig), out.shape[1] - i)
    l, rr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[0, i:i + n] += sig[:n] * l * gain
    out[1, i:i + n] += sig[:n] * rr * gain


def seg(start, dur):
    i = int(round(start * SR)) % N
    n = int(dur * SR)
    tw = TW[i:i + n] - TW[i]
    if len(tw) < n:
        tw = np.arange(n) / SR
    return np.arange(n) / SR, tw


def saw(f_ph, f, bright=1.0, maxh=40):
    """band-limited saw from a phase array; bright scales upper harmonics"""
    s = np.zeros_like(f_ph)
    K = int(min(maxh, 9000 / f))
    for n in range(1, K + 1):
        s += np.sin(n * f_ph) / n * (bright ** (n - 1))
    return s


# ---------------- drums ----------------
def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7) + 0.3 * rng.normal(0, 1, len(t)) * np.exp(-t * 300)
    return np.tanh(s * 1.8)


def clap():
    t = np.arange(int(0.3 * SR)) / SR
    n = rng.normal(0, 1, len(t))
    n = n - np.convolve(n, np.ones(6) / 6, 'same')  # crude highpass
    env = np.exp(-t * 22) + 0.6 * sum(np.exp(-np.maximum(t - d, 0) * 90) * (t >= d) for d in (0.0, 0.012, 0.024))
    tone = 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (n * 0.5 * env + tone)


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    t = np.arange(int(d * SR)) / SR
    n = rng.normal(0, 1, len(t))
    n = np.diff(np.diff(n, prepend=0), prepend=0)  # bright
    return n * np.exp(-t * (14 if open_ else 70)) * 0.35


def shaker():
    t = np.arange(int(0.06 * SR)) / SR
    n = np.diff(rng.normal(0, 1, len(t)), prepend=0)
    return n * np.sin(np.pi * np.clip(t / 0.06, 0, 1)) * 0.2


def tabla_na():
    t = np.arange(int(0.35 * SR)) / SR
    f = 620 * (1 + 0.04 * np.exp(-t * 40))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2.7) / SR) * np.exp(-t * 20)
    return s * np.exp(-t * 11) + 0.25 * rng.normal(0, 1, len(t)) * np.exp(-t * 200)


def tabla_ge():
    t = np.arange(int(0.6 * SR)) / SR
    f = 85 + 55 * (1 - np.exp(-t * 6))  # the bayan's upward glide
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 1.1


def tabla_tin():
    t = np.arange(int(0.2 * SR)) / SR
    return (np.sin(2 * np.pi * 900 * t) + 0.4 * np.sin(2 * np.pi * 2300 * t)) * np.exp(-t * 25) * 0.6


# ---------------- tonal voices ----------------
def bass(m, start, dur):
    t, tw = seg(start, dur)
    f = hz(m)
    ph = 2 * np.pi * f * tw
    bright = 0.55 + 0.35 * np.exp(-t * 18)  # filter "pluck"
    s = saw(ph, f, bright, 18) + 0.6 * np.sin(ph)
    env = (1 - np.exp(-t * 500)) * np.clip((dur - t) / 0.015, 0, 1) * np.exp(-t * 2)
    return np.tanh(s * env * 1.4)


def arp(m, start, dur):
    t, tw = seg(start, dur)
    f = hz(m)
    ph = 2 * np.pi * f * tw
    s = sum(np.sin(n * ph) / n * 0.7 ** ((n - 1) / 2) for n in (1, 3, 5, 7, 9))  # square-ish
    env = (1 - np.exp(-t * 800)) * np.exp(-t * 16)
    return s * env


def lead(notes, start):
    """monophonic synth lead with portamento, vibrato and meend (slides)"""
    total = sum(d for _, d in notes) + 0.3
    n = int(total * SR)
    t = np.arange(n) / SR
    fcurve = np.zeros(n)
    amp = np.zeros(n)
    pos = 0.0
    prev = None
    for m, d in notes:
        a, b = int(pos * SR), int((pos + d) * SR)
        if m is not None:
            target = hz(m)
            src = hz(prev) if prev is not None else target
            if d >= 2 * E8 and prev is None:
                src = hz(m - 1)  # meend into a phrase from a semitone below
            k = np.arange(b - a) / SR
            glide = 0.06 if prev is not None else 0.09
            fcurve[a:b] = target + (src - target) * np.exp(-k / glide * 3)
            vib = 1 + 0.006 * np.clip((k - 0.18) / 0.2, 0, 1) * np.sin(2 * np.pi * 5.6 * k)
            fcurve[a:b] *= vib
            env = np.clip(k / 0.012, 0, 1) * np.clip(((b - a) / SR - k) / 0.04, 0, 1) * (0.8 + 0.2 * np.exp(-k * 4))
            amp[a:b] = env
            prev = m
        else:
            fcurve[a:b] = hz(prev) if prev else 440
            prev = None
        pos += d
    fcurve[fcurve == 0] = 440
    ph = 2 * np.pi * np.cumsum(fcurve) / SR
    s = saw(ph, 700, 0.72, 14) + 0.5 * saw(ph * 1.004, 700, 0.6, 10)
    return s * amp


def stab(ms, start, dur=0.16):
    t, tw = seg(start, dur + 0.05)
    s = np.zeros_like(t)
    for m in ms:
        f = hz(m)
        for d in (-0.004, 0.004):
            s += saw(2 * np.pi * f * (1 + d) * tw, f, 0.7, 20)
    env = (1 - np.exp(-t * 300)) * np.exp(-t * 7) * np.clip((dur + 0.05 - t) / 0.05, 0, 1)
    return s * env / len(ms)


def pad(ms, start, dur):
    t, tw = seg(start, dur)
    s = np.zeros_like(t)
    for m in ms:
        f = hz(m)
        for d in (-0.003, 0.0, 0.003):
            s += np.sin(2 * np.pi * f * (1 + d) * tw) + 0.25 * np.sin(4 * np.pi * f * (1 + d) * tw)
    env = np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    return s * env / (3 * len(ms))


# ---------------- arrangement ----------------
PROG = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [56, 59, 64])]  # Am F G E
K, C, H, OH = kick(), clap(), hat(), hat(True)

for bar in range(BARS):
    s0 = bar * BAR
    root, chord = PROG[bar % 4]
    breakdown = 24 <= bar < 28
    build = 28 <= bar < 32

    # drums
    if not breakdown:
        for b in range(4):
            place(K, s0 + b * BEAT, gain=0.62)
        if bar >= 4:
            for b in (1, 3):
                place(C, s0 + b * BEAT, pan=0.05, gain=0.7)
        for b in range(4):
            place(OH if bar >= 8 else H, s0 + b * BEAT + E8, pan=0.3, gain=0.75 if bar >= 8 else 0.65)
            place(H, s0 + b * BEAT, pan=0.3, gain=0.18)
        if bar >= 16 and not build:
            for s in range(16):
                place(shaker(), s0 + s * E16, pan=-0.45, gain=0.35 + 0.15 * (s % 2))
    if bar == 31:  # clap roll into the loop
        for s in range(16):
            place(C, s0 + s * E16, pan=0.05, gain=0.12 + 0.3 * s / 16)

    # tabla: through the breakdown, light accents elsewhere
    if breakdown or build:
        pat = ['ge', 'na', 'tin', 'na', 'ge', 'ge', 'na', 'tin'] if bar % 2 == 0 else ['ge', 'na', 'ge', 'na', 'tin', 'na', 'ge', 'na']
        for k, stroke in enumerate(pat):
            snd = {'ge': tabla_ge, 'na': tabla_na, 'tin': tabla_tin}[stroke]()
            place(snd, s0 + k * E8, pan=-0.2, gain=0.42)
    elif bar >= 8 and bar % 4 == 3:
        for k, stroke in enumerate(['na', 'na', 'tin', 'na']):
            place({'na': tabla_na, 'tin': tabla_tin}[stroke](), s0 + 3 * BEAT + k * E16, pan=-0.2, gain=0.3)

    # disco octave bass
    if not (24 <= bar < 26):
        for e in range(8):
            m = root - 12 + (12 if e % 2 else 0)
            if e == 7 and bar % 4 == 3:
                m = root - 12 + 7  # walk-up into the next bar
            place(bass(m, s0 + e * E8, E8 * 0.85), s0 + e * E8, gain=0.22)

    # 16th arpeggio with ping-pong echo
    tones = chord + [c + 12 for c in chord]
    order = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 2]
    ag = 0.24 if bar < 8 else 0.26
    for s in range(16):
        st = s0 + s * E16
        a = arp(tones[order[s]], st, 0.25)
        place(a, st, pan=-0.5, gain=ag)
        place(a, st + 3 * E16, pan=0.5, gain=ag * 0.45)

    # pad under the breakdown and the build
    if breakdown or build or bar < 4:
        place(pad([root] + chord, s0, BAR + 0.3), s0, gain=0.3)

    # brass stabs on the offbeats (bars 17–24, 29–32)
    if 16 <= bar < 24 or build:
        for b in (0, 2):
            st = s0 + b * BEAT + E8
            place(stab([c + 12 for c in chord], st), st, pan=0.2, gain=0.22)
        if bar % 4 == 3:
            for k, dm in enumerate([0, 2, 3]):
                st = s0 + 3 * BEAT + k * E16
                place(stab([chord[-1] + 12 + dm], st, 0.08), st, pan=0.2, gain=0.16)

# ---------------- the hook ----------------
q, e, h = BEAT, E8, 2 * BEAT
HOOK_A = [(76, q), (72, e), (74, e), (76, q), (81, q),   # Am
          (79, e), (77, q + e), (76, e), (74, e), (72, q),  # F
          (74, q), (71, e), (72, e), (74, q), (79, q),   # G
          (77, e), (76, e), (74, e), (72, e), (71, q), (68, q)]  # E (G#)
HOOK_B = [(76, q), (72, e), (74, e), (76, q), (81, q),
          (79, e), (77, q + e), (76, e), (74, e), (72, q),
          (74, q), (76, e), (77, e), (76, q), (74, q),
          (72, e), (71, e), (68, q), (69, h)]
place(lead(HOOK_A, 8 * BAR), 8 * BAR, pan=0.1, gain=0.3)
place(lead(HOOK_B, 12 * BAR), 12 * BAR, pan=0.1, gain=0.3)
# second chorus an octave up in places, with ornaments
HOOK_C = [(88, q), (84, e), (86, e), (88, q), (93, q),
          (91, e), (89, q + e), (88, e), (86, e), (84, q),
          (86, q), (83, e), (84, e), (86, q), (91, q),
          (89, e), (88, e), (86, e), (84, e), (83, q), (80, q)]
place(lead([(m - 12, d) for m, d in HOOK_C], 16 * BAR), 16 * BAR, pan=0.1, gain=0.28)
place(lead([(m - 12, d) for m, d in HOOK_B], 20 * BAR), 20 * BAR, pan=0.1, gain=0.28)
# sparse call in the build, answered by the brass
place(lead([(81, h), (79, e), (77, e), (76, q), (None, 2 * BAR - 2 * h), (76, q), (77, e), (79, e), (80, h)], 28 * BAR), 28 * BAR, pan=0.1, gain=0.16)

# ---------------- finish ----------------
out[:, :TAIL] += out[:, N:]
out = out[:, :N]
crackle = np.zeros(N)
for p in rng.integers(0, N - 40, 500):
    crackle[p:p + 30] += rng.uniform(0.01, 0.06) * rng.choice([-1, 1]) * np.exp(-np.arange(30) / 4)
out += crackle * 0.4 + rng.normal(0, 0.002, (2, N))
out = np.tanh(out / np.max(np.abs(out)) * 1.6) / np.tanh(1.6)  # tape saturation
out *= 0.89
pcm = (out.T * 32767).astype('<i2')
with wave.open('disco_dry.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'loop {L:.4f}s')
