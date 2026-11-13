#!/usr/bin/env python3
"""Voice-over for one episode.

Writes public/episodes/<slug>/voice.mp3 and episodes/<slug>/timings.json
(scene start/duration + per-word timestamps for karaoke captions).

Engines:
  edge    free Microsoft neural voices, tuned for reels: Madhur on odd episodes, Swara on even ones;
          a scene with "speaker": "alt" uses the other voice (e.g. the interviewer); word timestamps included
  sarvam  Sarvam Bulbul v4 Flash reel voices (sunny_hi_reels / ritu_hi_reels, alternating by episode; needs
          SARVAM_API_KEY); word times spread by word length, or aligned with faster-whisper if WHISPER_MODEL is set and
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
    """Assign times to words by their length, with a short pause after punctuation
    (used when the engine gives no word timestamps; audio is already trimmed to the speech)."""
    def w8(w):
        return max(1, len(re.sub(r"[^\w\u0900-\u097F]", "", w))) + 1
    pauses = [3 if re.search(r"[,.!?।:]$", w) else 0 for w in words]
    total = sum(w8(w) for w in words) + sum(pauses[:-1])
    t = start_ms
    out = []
    for i, w in enumerate(words):
        d = dur_ms * w8(w) / total
        out.append((w, t, t + d * 0.95))
        t += d + (dur_ms * pauses[i] / total if i < len(words) - 1 else 0)
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
# Tuned for reels: faster and slightly brighter than the default newsreader delivery.
EDGE_PRESETS = {
    "hi-IN-MadhurNeural": {"rate": "+15%", "pitch": "+5Hz"},
    "hi-IN-SwaraNeural": {"rate": "+10%", "pitch": "+2Hz"},
}
EDGE_PAIR = {"hi-IN-MadhurNeural": "hi-IN-SwaraNeural", "hi-IN-SwaraNeural": "hi-IN-MadhurNeural"}


def edge_voices(episode):
    """Main voice alternates by episode (odd = Madhur, even = Swara) unless the episode pins one.
    Returns {"main": (voice, rate, pitch), "alt": (...)}; scenes with "speaker": "alt" use the other voice."""
    cfg = episode.get("voice", {})
    main = cfg.get("voiceId") or os.environ.get("EDGE_VOICE") or (
        "hi-IN-MadhurNeural" if episode.get("number", 1) % 2 else "hi-IN-SwaraNeural")
    alt = EDGE_PAIR.get(main, "hi-IN-SwaraNeural")

    def spec(v, own):
        p = EDGE_PRESETS.get(v, {"rate": "+10%", "pitch": "+0Hz"})
        return (v, (own and cfg.get("rate")) or os.environ.get("EDGE_RATE") or p["rate"],
                (own and cfg.get("pitch")) or os.environ.get("EDGE_PITCH") or p["pitch"])

    return {"main": spec(main, True), "alt": spec(alt, False)}


# Sarvam's voices made for reels; the main voice alternates by episode like the edge voices.
SARVAM_PAIR = ("sunny_hi_reels", "ritu_hi_reels")


def sarvam_voices(episode):
    cfg = episode.get("voice", {})
    env_main = os.environ.get("SARVAM_SPEAKER")
    main = env_main or (cfg.get("voiceId") if cfg.get("engine") == "sarvam" else None) or (
        SARVAM_PAIR[0] if episode.get("number", 1) % 2 else SARVAM_PAIR[1])
    alt = os.environ.get("SARVAM_ALT_SPEAKER") or (SARVAM_PAIR[1] if main == SARVAM_PAIR[0] else SARVAM_PAIR[0])
    return {"main": main, "alt": alt}


async def edge_line(text, voice, rate, mp3: Path, pitch="+0Hz"):
    import edge_tts

    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
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
        "model": os.environ.get("SARVAM_MODEL", "bulbul:v4-flash"),
        "pace": pace,
        "speech_sample_rate": 24000,
    }
    for attempt in range(3):
        try:
            res = client.text_to_speech.convert(**kwargs)
            break
        except Exception as e:  # rate limit / network hiccup
            if attempt == 2:
                raise
            print(f"  sarvam retry ({e})", file=sys.stderr)
            import time
            time.sleep(3 * (attempt + 1))
    wav.write_bytes(base64.b64decode("".join(res.audios)))
    # word timings: faster-whisper only if explicitly enabled (WHISPER_MODEL=base), else spread by length
    return whisper_bounds(wav) if os.environ.get("WHISPER_MODEL") else None


def whisper_bounds(audio: Path):
    try:
        from faster_whisper import WhisperModel  # optional: pip install faster-whisper
    except ImportError:
        return None
    model = WhisperModel(os.environ.get("WHISPER_MODEL", "base"), compute_type="int8")
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
    if engine == "sarvam" and not os.environ.get("SARVAM_API_KEY"):
        print("SARVAM_API_KEY not set: falling back to the free Microsoft voices", file=sys.stderr)
        engine = "edge"
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
            v, rate, pitch = edge_voices(episode)[scene.get("speaker", "main")]
            for attempt in range(3):
                try:
                    bounds = asyncio.run(edge_line(text, v, rate, raw, pitch))
                    break
                except Exception as e:  # network hiccup: retry
                    if attempt == 2:
                        raise
                    print(f"  edge-tts retry ({e})", file=sys.stderr)
        elif engine == "sarvam":
            speaker = sarvam_voices(episode)[scene.get("speaker", "main")]
            bounds = sarvam_line(text, speaker, float(os.environ.get("SARVAM_PACE", "1.15")), raw)
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
