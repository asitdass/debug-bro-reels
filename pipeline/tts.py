#!/usr/bin/env python3
"""Voice-over for one episode.

Writes public/episodes/<slug>/voice.mp3 and episodes/<slug>/timings.json
(scene start/duration + per-word timestamps for karaoke captions).

Engines:
  edge    free Microsoft neural voices (hi-IN-MadhurNeural, hi-IN-SwaraNeural); word timestamps included
  sarvam  Sarvam Bulbul (needs SARVAM_API_KEY; free trial credits); word times aligned with faster-whisper if
          installed, else spread across the line by character length
  silent  no audio; timings estimated (preview only)

usage: python3 pipeline/tts.py <slug> [--engine edge|sarvam|silent]
"""
import argparse
import asyncio
import base64
import inspect
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEAD_MS = 300  # silence before the first line
GAP_MS = 260  # pause between scenes
TAIL_MS = 600


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration_ms(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return float(out) * 1000


def vo_words(text: str):
    return [w for w in re.split(r"\s+", text.strip()) if w]


def spread(words, start_ms, dur_ms):
    """Assign times to words proportionally to their length (fallback when the engine gives none)."""
    weights = [max(1, len(re.sub(r"[^\wऀ-ॿ]", "", w))) + 1 for w in words]
    total = sum(weights)
    t = start_ms
    out = []
    for w, k in zip(words, weights):
        d = dur_ms * k / total
        out.append((w, t, t + d * 0.92))
        t += d
    return out


def map_boundaries(words, bounds):
    """Keep our own spelling (with punctuation) but take times from the engine's word boundaries."""
    if not bounds:
        return None
    if len(bounds) == len(words):
        return [(w, b[0], b[1]) for w, b in zip(words, bounds)]
    # counts differ (numbers expanded, punctuation split…): map by relative position
    out = []
    n, m = len(words), len(bounds)
    for i, w in enumerate(words):
        j = min(m - 1, round(i * (m - 1) / max(1, n - 1)))
        out.append((w, bounds[j][0], bounds[j][1]))
    # keep times increasing
    for i in range(1, len(out)):
        if out[i][1] <= out[i - 1][1]:
            prev = out[i - 1]
            out[i] = (out[i][0], prev[1] + 120, max(prev[2], prev[1] + 240))
    return out


# ---------------------------------------------------------------- engines
async def edge_line(text, voice, rate, mp3: Path):
    import edge_tts

    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    bounds = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 10_000
                bounds.append((s, s + chunk["duration"] / 10_000))
    return bounds


def sarvam_line(text, speaker, pace, wav: Path):
    from sarvamai import SarvamAI

    client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])
    params = inspect.signature(client.text_to_speech.convert).parameters
    lang_key = "target_language_code" if "target_language_code" in params else "language_code"
    kwargs = {
        "text": text,
        lang_key: "hi-IN",
        "speaker": speaker,
        "model": os.environ.get("SARVAM_MODEL", "bulbul:v3"),
        "pace": pace,
        "speech_sample_rate": 24000,
    }
    res = client.text_to_speech.convert(**kwargs)
    wav.write_bytes(base64.b64decode("".join(res.audios)))
    return whisper_bounds(wav)


def whisper_bounds(audio: Path):
    try:
        from faster_whisper import WhisperModel  # optional: pip install faster-whisper
    except ImportError:
        return None
    model = WhisperModel(os.environ.get("WHISPER_MODEL", "small"), compute_type="int8")
    segs, _ = model.transcribe(str(audio), language="hi", word_timestamps=True)
    return [(w.start * 1000, w.end * 1000) for s in segs for w in (s.words or [])]


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--engine")
    args = ap.parse_args()

    ep_dir = ROOT / "episodes" / args.slug
    episode = json.loads((ep_dir / "episode.json").read_text())
    voice = episode.get("voice", {})
    engine = args.engine or os.environ.get("TTS_ENGINE") or voice.get("engine", "edge")
    pub = ROOT / "public" / "episodes" / args.slug
    pub.mkdir(parents=True, exist_ok=True)

    if engine == "silent":
        subprocess.run(["node", "-e", f"""
import('{(ROOT / 'src/estimate.js').as_posix()}').then(m => {{
  const ep = require('{(ep_dir / 'episode.json').as_posix()}');
  require('fs').writeFileSync('{(ep_dir / 'timings.json').as_posix()}', JSON.stringify(m.estimateTimings(ep), null, 2));
}})"""], check=True)
        print("silent: estimated timings written")
        return

    tmp = Path(tempfile.mkdtemp(prefix="vo-"))
    parts, scenes, words = [], [], []
    t = LEAD_MS
    silence = tmp / "gap.wav"
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{GAP_MS/1000}", silence])
    lead = tmp / "lead.wav"
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{LEAD_MS/1000}", lead])
    parts.append(lead)

    for i, scene in enumerate(episode["scenes"]):
        text = scene["vo"]
        raw = tmp / f"s{i:02d}.raw"
        if engine == "edge":
            v = voice.get("voiceId") or os.environ.get("EDGE_VOICE", "hi-IN-MadhurNeural")
            rate = voice.get("rate") or os.environ.get("EDGE_RATE", "+8%")
            for attempt in range(3):
                try:
                    bounds = asyncio.run(edge_line(text, v, rate, raw))
                    break
                except Exception as e:  # network hiccup: retry
                    if attempt == 2:
                        raise
                    print(f"  edge-tts retry ({e})", file=sys.stderr)
        elif engine == "sarvam":
            speaker = voice.get("voiceId") or os.environ.get("SARVAM_SPEAKER", "shubh")
            bounds = sarvam_line(text, speaker, float(os.environ.get("SARVAM_PACE", "1.1")), raw)
        else:
            sys.exit(f"unknown engine {engine}")

        wav = tmp / f"s{i:02d}.wav"
        # trim leading/trailing silence so pacing stays tight, resample to one format
        if bounds:
            # cut exactly around the spoken words so word times stay correct
            lead_cut = max(0.0, bounds[0][0] - 60)
            end = min(duration_ms(raw), bounds[-1][1] + 220)
            run(["ffmpeg", "-y", "-i", raw, "-ss", f"{lead_cut/1000:.3f}", "-to", f"{end/1000:.3f}",
                 "-ar", "24000", "-ac", "1", wav])
        else:
            lead_cut = 0.0
            run([
                "ffmpeg", "-y", "-i", raw, "-af",
                "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                "silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                "-ar", "24000", "-ac", "1", wav,
            ])
        d = duration_ms(wav)
        ws = vo_words(text)
        timed = map_boundaries(ws, [(a - lead_cut, b - lead_cut) for a, b in bounds] if bounds else None) or spread(ws, 0, d)
        for w, a, b in timed:
            words.append({"text": w, "startMs": round(t + max(0, a)), "endMs": round(t + min(d, max(a + 80, b))), "scene": i})
        scenes.append({"startMs": 0 if i == 0 else t, "durMs": d + (LEAD_MS if i == 0 else 0)})
        parts.append(wav)
        t += d
        if i < len(episode["scenes"]) - 1:
            parts.append(silence)
            t += GAP_MS
        print(f"  scene {i+1}/{len(episode['scenes'])}: {d/1000:.1f}s, {len(ws)} words")

    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    out = pub / "voice.mp3"
    # loudness-normalise to Instagram's ~-14 LUFS
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
         "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", out])
    timings = {
        "totalMs": round(t + TAIL_MS),
        "audio": f"episodes/{args.slug}/voice.mp3",
        "scenes": [{"startMs": round(s["startMs"]), "durMs": round(s["durMs"])} for s in scenes],
        "words": words,
    }
    (ep_dir / "timings.json").write_text(json.dumps(timings, ensure_ascii=False, indent=2))
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"voice: {out} ({t/1000:.1f}s)")


if __name__ == "__main__":
    main()
