# Musik + efek suara sintesis TalentaBola: stomp-clap 120 BPM, peluit, sapuan, klik tap, sorak penonton.
# Jadwal adegan disalin dari S0 di video.html (ponytail: ubah dua-duanya kalau jadwal berubah).
import numpy as np, wave, sys
sr = 44100; DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 50
S0 = [0, 4.5, 10.5, 16.5, 23.5, 29.5, 36, 43]
REVEAL = S0[2]; TAPS = [S0[3] + 1.6 + i * .75 for i in (1, 2, 3, 4)]
bpm = 120; beat = 60 / bpm; bar = 4 * beat
rng = np.random.default_rng(7)
out = np.zeros((int(sr * DUR), 2))

def add(sig, start, vol=1.0, pan=.5):
    i = int(start * sr); n = min(len(sig), len(out) - i)
    if n > 0 and i >= 0:
        out[i:i + n, 0] += sig[:n] * vol * (1 - pan) * 2; out[i:i + n, 1] += sig[:n] * vol * pan * 2

def tt(d): return np.arange(int(sr * d)) / sr
def note(m): return 440 * 2 ** ((m - 69) / 12)

def band_noise(d, lo, hi):
    """Noise berwarna lewat FFT (tanpa scipy)."""
    n = int(sr * d); spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / sr)
    spec *= ((f > lo) & (f < hi)); x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)

def kick(d=.35):
    x = tt(d); return np.sin(2 * np.pi * (50 * x + 90 * (1 - np.exp(-x * 35)) / 35)) * np.exp(-x * 9)

def stomp():
    return kick(.4) * .9 + band_noise(.4, 80, 900) * np.exp(-tt(.4) * 18) * .5

def clap():
    x = tt(.25); env = sum(np.exp(-np.clip(x - o, 0, None) * 60) * (x >= o) for o in (0, .012, .024))
    return band_noise(.25, 900, 5000) * env * .8

def hat():
    return band_noise(.06, 6000, 14000) * np.exp(-tt(.06) * 70)

def stab(ch, d=.22):
    x = tt(d); s = sum(sum(np.sin(2 * np.pi * note(m) * k * x) / k for k in range(1, 8)) for m in ch)
    return s * np.minimum(x / .005, 1) * np.exp(-x * 9) / len(ch)

# Am - F - C - G, energik
CH = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
nb = int(np.ceil(DUR / bar))
for b in range(nb):
    t0 = b * bar
    ch = CH[b % 4]
    if t0 < REVEAL - .01:
        # sebelum reveal: stomp-stomp-clap menegang, tanpa harmoni
        for k, (fn, v) in enumerate([(stomp, .5), (stomp, .5), (clap, .45), (None, 0)]):
            if fn: add(fn(), t0 + k * beat, v)
        continue
    for k in range(4):
        add(kick(), t0 + k * beat, .6)
        if k % 2: add(clap(), t0 + k * beat, .4)
    for k in range(8):
        add(hat(), t0 + k * beat / 2, .12 if k % 2 else .07, pan=.65)
        # bass delapan-an
        x = tt(beat / 2 * .9); fb = note(ch[0] - 24)
        add((np.sin(2 * np.pi * fb * x) + .3 * np.sin(2 * np.pi * 2 * fb * x)) * np.exp(-x * 4), t0 + k * beat / 2, .28)
    for k in (1, 3, 5, 6):
        add(stab([m + 12 for m in ch]), t0 + k * beat / 2, .16, pan=.4 + .2 * (k % 2))

# riser ke reveal + hentakan
r = band_noise(2.2, 400, 9000) * np.linspace(0, 1, int(sr * 2.2)) ** 2
add(r, REVEAL - 2.2, .22)
add(kick(.8), REVEAL, 1.0); add(band_noise(1.6, 3000, 15000) * np.exp(-tt(1.6) * 2.5), REVEAL, .3)

# peluit wasit: dua tiupan, trill 28 Hz
def whistle(d):
    x = tt(d); f = 2900 + 40 * np.sin(2 * np.pi * 5 * x)
    tone = np.sin(2 * np.pi * np.cumsum(f) / sr) * (.65 + .35 * np.sin(2 * np.pi * 28 * x))
    return (tone + .08 * band_noise(d, 2500, 4000)) * np.minimum(x / .02, 1) * np.minimum((d - x) / .04, 1)
add(whistle(.22), .15, .35); add(whistle(.6), .45, .35)

# sapuan di tiap pergantian adegan
for s in S0[1:]:
    d = .8; w = band_noise(d, 300, 7000) * np.sin(np.pi * tt(d) / d) ** 2
    add(w, s - .42, .25)

# klik tiap tap presensi
for at in TAPS:
    x = tt(.05); add(np.sin(2 * np.pi * 1800 * x) * np.exp(-x * 120) + .3 * band_noise(.05, 3000, 9000) * np.exp(-x * 200), at + .1, .5)

# sorak penonton di penutup
d = 5.5; x = tt(d)
crowd = sum(band_noise(d, lo, lo * 2.2) * (1 + .5 * np.sin(2 * np.pi * rng.uniform(1.5, 4) * x + rng.uniform(0, 6))) for lo in (300, 600, 1200, 2400))
add(crowd / 4 * np.minimum(x / .8, 1) * np.exp(-np.clip(x - 1.5, 0, None) * .6), S0[7] + .2, .35)

fade = np.minimum(np.arange(len(out)) / sr / .05, 1) * np.minimum((DUR - np.arange(len(out)) / sr) / 2.5, 1)
out *= fade[:, None]
out = np.tanh(out * 1.2); out = out / np.abs(out).max() * .8
w = wave.open('music.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
