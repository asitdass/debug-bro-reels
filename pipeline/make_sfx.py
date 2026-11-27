#!/usr/bin/env python3
"""Synthesises the DSA-101 sound effects and the music bed (no downloads, no licences to track).
usage: python3 pipeline/make_sfx.py   -> public/sfx/dsa/*.wav, public/sfx/dsa/bed.mp3"""
import subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/sfx/dsa"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(d, attack=0.003, decay=8.0):
    x = t(d)
    return np.minimum(1, x / attack) * np.exp(-decay * x)


def sweep(f0, f1, d):
    x = t(d)
    f = f0 * (f1 / f0) ** (x / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def lp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), "low")
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def swept_noise(d, f0, f1, q=0.35):
    """noise through a band-pass whose centre moves f0 -> f1 (whoosh)"""
    n = rng.standard_normal(int(SR * d))
    out = np.zeros_like(n)
    step = 512
    for i in range(0, len(n), step):
        fc = f0 * (f1 / f0) ** (i / len(n))
        b, a = butter(2, [max(60, fc * (1 - q)) / (SR / 2), min(SR / 2 - 100, fc * (1 + q)) / (SR / 2)], "band")
        out[i:i + step] = lfilter(b, a, n[i:i + step])
    return out


def norm(x, peak=0.8):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def save(name, x):
    wavfile.write(OUT / f"{name}.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


# ---- effects
save("pop", norm(sweep(900, 260, 0.12) * env(0.12, 0.002, 30) + 0.25 * rng.standard_normal(int(SR * 0.12)) * env(0.12, 0.001, 120)))
save("tick", norm(np.sin(2 * np.pi * 2400 * t(0.04)) * env(0.04, 0.001, 90), 0.6))
d = 0.45
save("whoosh", norm(swept_noise(d, 400, 3800) * np.sin(np.pi * t(d) / d) ** 1.5))
d = 0.3
save("swish", norm(swept_noise(d, 5000, 500) * np.sin(np.pi * t(d) / d) ** 1.2, 0.7))
d = 1.2
x = t(d)
r = swept_noise(d, 250, 5000, 0.5) * (x / d) ** 2 + 0.35 * sweep(180, 1400, d) * (x / d) ** 2
save("riser", norm(r))
d = 0.9
x = t(d)
imp = sweep(110, 38, d) * env(d, 0.002, 5) + 0.6 * lp(rng.standard_normal(len(x)), 900) * env(d, 0.001, 14)
save("impact", norm(imp, 0.95))
d = 1.1
x = t(d)
save("ding", norm((np.sin(2 * np.pi * 1318 * x) + 0.5 * np.sin(2 * np.pi * 1975 * x) + 0.25 * np.sin(2 * np.pi * 2637 * x)) * env(d, 0.002, 4.5), 0.7))
d = 0.4
x = t(d)
save("buzz", norm(np.sign(np.sin(2 * np.pi * 95 * x)) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * x)) * env(d, 0.003, 3) , 0.6))
d = 1.3
x = t(d)
tada = np.zeros(len(x))
for k, f in enumerate([523, 659, 784, 1047]):
    s0 = int(SR * 0.07 * k)
    xs = x[: len(x) - s0]
    seg = (np.sin(2 * np.pi * f * xs) + 0.4 * np.sin(2 * np.pi * 2 * f * xs)) * np.minimum(1, xs / 0.003) * np.exp(-3.2 * xs)
    tada[s0:] += seg * (0.7 if k < 3 else 1.0)
save("tada", norm(tada, 0.7))
d = 0.6
x = t(d)
sp = np.zeros(len(x))
for _ in range(14):
    s0 = int(rng.uniform(0, 0.4) * SR)
    f = rng.uniform(2500, 6500)
    n = len(x) - s0
    seg = np.sin(2 * np.pi * f * x[:n]) * env(n / SR, 0.001, 22)
    sp[s0:] += seg[: len(sp) - s0]
save("sparkle", norm(sp, 0.55))
save("thud", norm(sweep(130, 45, 0.2) * env(0.2, 0.002, 18), 0.9))
d = 0.5
save("glitch", norm(np.sign(rng.standard_normal(int(SR * d))) * (np.sin(2 * np.pi * 38 * t(d)) > 0) * env(d, 0.001, 6), 0.5))
d = 0.12
save("type", norm(bp(rng.standard_normal(int(SR * d)), 1500, 5000) * env(d, 0.001, 70), 0.5))

# ---- music bed: 104 bpm, 8 bars, A minor lo-fi groove
bpm = 104
beat = 60 / bpm
bars = 8
total = beat * 4 * bars
n = int(SR * total)
bed = np.zeros(n)


def put(sig, at):
    i = int(at * SR)
    m = min(len(sig), n - i)
    if m > 0:
        bed[i:i + m] += sig[:m]


kick = sweep(150, 48, 0.28) * env(0.28, 0.002, 11)
hat = bp(rng.standard_normal(int(SR * 0.06)), 6000, 14000) * env(0.06, 0.001, 70) * 0.5
snare = (bp(rng.standard_normal(int(SR * 0.18)), 1200, 6000) * env(0.18, 0.001, 24) + 0.3 * sweep(220, 150, 0.18) * env(0.18, 0.001, 20)) * 0.6
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
bassn = [55, 43.65, 65.4, 49]
for bar in range(bars):
    b0 = bar * 4 * beat
    for q in range(4):
        tq = b0 + q * beat
        if q in (0, 2):
            put(kick * 0.9, tq)
        if q in (1, 3):
            put(snare, tq)
        put(hat, tq)
        put(hat * 0.6, tq + beat / 2)
    ch = chords[(bar // 2) % 4]
    for q in range(8):
        f = ch[(q * 2) % 3] * (2 if q % 4 == 3 else 1)
        dd = beat
        x = t(dd)
        pl = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2 * f * x)) * env(dd, 0.004, 7) * 0.22
        put(pl, b0 + q * beat / 2)
    bn = bassn[(bar // 2) % 4]
    for q in (0, 1.5, 2, 3):
        dd = beat * 0.9
        put(np.sin(2 * np.pi * bn * t(dd)) * env(dd, 0.005, 4) * 0.5, b0 + q * beat)
bed = norm(lp(bed, 9000), 0.9)
wavfile.write(OUT / "bed.wav", SR, (bed * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / "bed.wav"), "-b:a", "128k", str(OUT / "bed.mp3")], check=True)
(OUT / "bed.wav").unlink()
print("sfx written to", OUT)
