"""Draws the Debug Bro mascot (a cartoon of Asit) on a Modal GPU, with approval on Telegram.

1. The bot asks for 1-2 photos on Telegram (photos never touch the public repo).
2. Qwen-Image-Edit draws 4 cartoon candidates; you tap the one you like.
3. It draws the pose set from that candidate, cuts each pose out, and sends a contact sheet: "Use it" or "Redo poses".
4. Approved poses go to public/mascot/<pose>.png + mascot.json; the workflow commits them.

usage: python pipeline/mascot.py [--poses-only]   (--poses-only reuses public/mascot/master.png)
env: MODAL_TOKEN_ID, MODAL_TOKEN_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
"""
import io
import json
import os
import random
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "mascot"
WORK = ROOT / "out" / "mascot"
TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT = os.environ["TELEGRAM_CHAT_ID"]
WAIT_MIN = int(os.environ.get("MASCOT_WAIT_MIN", "45"))

STYLE = ("a flat 2D vector cartoon in the style of a modern animated explainer series: thick clean dark outlines, "
         "flat colours with one soft cel-shade tone, slightly oversized head, expressive eyes, friendly and cool")
LOOK = ("same face, curly dark brown hair, full trimmed dark beard, dark charcoal shirt with tiny white dots worn open "
        "with rolled-up sleeves over a blue and white striped t-shirt, black jeans, white sneakers, silver watch with "
        "a tan leather strap")
FRAME = ("Whole body visible from hair to shoes, centred, facing the viewer, plain flat light grey background, "
         "no floor shadow, no text.")
MASTER_PROMPT = (f"Turn the man in these photos into a full-body cartoon character, {STYLE}. Keep him clearly "
                 f"recognisable: {LOOK}. He stands with his arms crossed and a confident half smile. {FRAME}")
KEEP = ("Keep this exact cartoon character: same drawing style, same face, hair, beard, outfit and colours. "
        "Change only his pose and expression: ")
# pose name -> what he does. "crossed" is the master itself; "talk" is drawn from "idle" so the two line up.
POSES = {
    "idle": "standing relaxed, hands at his sides, friendly closed-mouth smile",
    "point": "pointing up and to the side with his index finger, mouth open, explaining something",
    "explain": "both hands open in front of his chest, palms up, explaining, mouth open",
    "think": "one hand on his chin, eyes looking up, thinking hard",
    "shock": "both hands on his head, eyes wide, mouth wide open, shocked",
    "laugh": "laughing hard with eyes closed, one hand on his belly",
    "facepalm": "facepalm, one hand covering his eyes, disappointed",
    "thumbsup": "big grin, giving a thumbs up with one hand",
    "shrug": "shrugging with both palms up and eyebrows raised",
    "laptop": "holding an open laptop on one forearm and typing on it with the other hand, focused",
}
TALK_PROMPT = ("Keep everything in this image exactly the same: same character, pose, outfit, colours and framing. "
               "Only open his mouth as if he is in the middle of a sentence.")


# ---------- Telegram ----------
def tg(method, data=None, files=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    if files:
        boundary = uuid.uuid4().hex
        body = io.BytesIO()
        for k, v in (data or {}).items():
            body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for k, (name, blob) in files.items():
            body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\n'
                       f"Content-Type: application/octet-stream\r\n\r\n".encode())
            body.write(blob + b"\r\n")
        body.write(f"--{boundary}--\r\n".encode())
        req = urllib.request.Request(url, body.getvalue(), {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    else:
        req = urllib.request.Request(url, json.dumps(data or {}).encode(), {"Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # Telegram upload hiccups
            print(f"telegram {method} failed ({e}); retry {i + 1}")
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"telegram {method} failed")


def say(text, buttons=None):
    data = {"chat_id": CHAT, "text": text}
    if buttons:
        data["reply_markup"] = {"inline_keyboard": [[{"text": t, "callback_data": d} for t, d in row] for row in buttons]}
    return tg("sendMessage", data)["result"]["message_id"]


def send_album(images, caption):
    media, files = [], {}
    for i, png in enumerate(images[:10]):
        media.append({"type": "photo", "media": f"attach://p{i}", **({"caption": caption} if i == 0 else {})})
        files[f"p{i}"] = (f"p{i}.jpg", to_jpeg(png))
    tg("sendMediaGroup", {"chat_id": CHAT, "media": json.dumps(media)}, files)


def send_photo(blob, caption, buttons=None):
    data = {"chat_id": CHAT, "caption": caption}
    if buttons:
        data["reply_markup"] = json.dumps({"inline_keyboard": [[{"text": t, "callback_data": d} for t, d in row] for row in buttons]})
    return tg("sendPhoto", data, {"photo": ("sheet.jpg", blob)})["result"]["message_id"]


_offset = None


def updates(timeout=50):
    global _offset
    if _offset is None:  # skip anything sent before this run
        last = tg("getUpdates", {"offset": -1, "timeout": 0}).get("result", [])
        _offset = last[-1]["update_id"] + 1 if last else 0
    r = tg("getUpdates", {"offset": _offset, "timeout": timeout})
    for u in r.get("result", []):
        _offset = u["update_id"] + 1
        yield u


def wait_tap(message_id, minutes=WAIT_MIN):
    until = time.time() + minutes * 60
    while time.time() < until:
        for u in updates():
            q = u.get("callback_query")
            if q and q.get("message", {}).get("message_id") == message_id:
                tg("answerCallbackQuery", {"callback_query_id": q["id"], "text": "Got it"})
                return q["data"]
    return None


def ask_photos():
    say("Debug Bro mascot: send me 1-2 clear photos of you (face visible, upper body). "
        "They go straight to the drawing GPU and are never saved in the public repo.")
    photos, first_at, until = [], None, time.time() + WAIT_MIN * 60
    while time.time() < until and len(photos) < 3:
        if first_at and time.time() - first_at > 60:
            break
        for u in updates(timeout=20):
            m = u.get("message") or {}
            if str(m.get("chat", {}).get("id")) != str(CHAT):
                continue
            fid = None
            if m.get("photo"):
                fid = m["photo"][-1]["file_id"]
            elif str(m.get("document", {}).get("mime_type", "")).startswith("image/"):
                fid = m["document"]["file_id"]
            if fid:
                path = tg("getFile", {"file_id": fid})["result"]["file_path"]
                with urllib.request.urlopen(f"https://api.telegram.org/file/bot{TOKEN}/{path}") as r:
                    photos.append(r.read())
                first_at = first_at or time.time()
    if not photos:
        say("No photo arrived, so I stopped. Run the mascot workflow again when you're ready.")
        sys.exit(1)
    say(f"Got {len(photos)} photo(s). Drawing 4 cartoon versions of you (first run downloads the model, ~5 min)…")
    return photos


# ---------- images ----------
def to_jpeg(png, q=88):
    img = Image.open(io.BytesIO(png)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=q)
    return buf.getvalue()


_rembg = None


def cutout(png):
    """Transparent PNG of the character, trimmed to its outline."""
    global _rembg
    from rembg import new_session, remove
    _rembg = _rembg or new_session(os.environ.get("REMBG_MODEL", "birefnet-general"))
    img = remove(Image.open(io.BytesIO(png)).convert("RGB"), session=_rembg)
    bbox = img.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
    img = img.crop(bbox) if bbox else img
    if img.height > 1400:
        img = img.resize((round(img.width * 1400 / img.height), 1400), Image.LANCZOS)
    return img


def contact_sheet(cut):
    names = list(cut)
    cols, cw, ch = 4, 360, 560
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cw, rows * ch), "#0d0d10")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 30)
    except OSError:
        font = ImageFont.load_default()
    for i, n in enumerate(names):
        im = cut[n].copy()
        im.thumbnail((cw - 30, ch - 70))
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(im, (x + (cw - im.width) // 2, y + ch - 60 - im.height), im)
        draw.text((x + 18, y + 14), n, fill="#ffb547", font=font)
    buf = io.BytesIO()
    sheet.save(buf, "JPEG", quality=90)
    return buf.getvalue()


# ---------- main ----------
def main():
    import modal
    from modal_editor import Editor, app

    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    poses_only = "--poses-only" in sys.argv and (OUT / "master.png").exists()

    with modal.enable_output(), app.run():
        ed = Editor()
        if poses_only:
            master = (OUT / "master.png").read_bytes()
            seed_base = random.randint(1, 10_000)
        else:
            photos = ask_photos()
            while True:
                seed_base = random.randint(1, 10_000)
                cands = ed.edit.remote(photos, MASTER_PROMPT, [seed_base + i for i in range(4)])
                for i, c in enumerate(cands):
                    (WORK / f"candidate-{i + 1}.png").write_bytes(c)
                send_album(cands, "Which one is you? Tap below.")
                mid = say("Pick the cartoon to build the pose set from:",
                          [[(str(i + 1), f"pick:{i}") for i in range(4)], [("None, redraw", "pick:redo")]])
                choice = wait_tap(mid)
                if choice is None:
                    say("No answer, so I stopped. The 4 versions are saved in the run's files.")
                    sys.exit(1)
                if choice != "pick:redo":
                    master = cands[int(choice.split(":")[1])]
                    break
                say("Redrawing 4 new versions…")
            (OUT / "master.png").write_bytes(master)

        for attempt in range(3):
            say("Drawing the pose set (11 poses, ~5 min)…")
            raw = {"crossed": master}
            for i, (name, pose) in enumerate(POSES.items()):
                raw[name] = ed.edit.remote([master], KEEP + pose + ". " + FRAME, [seed_base + 100 * attempt + i])[0]
                print(f"drew {name}")
            raw["talk"] = ed.edit.remote([raw["idle"]], TALK_PROMPT, [seed_base + 999])[0]
            cut = {}
            for name, png in raw.items():
                (WORK / f"{name}-raw.png").write_bytes(png)
                cut[name] = cutout(png)
            mid = send_photo(contact_sheet(cut), "Debug Bro pose set. Use it in the reels?",
                             [[("Use it", "poses:ok"), ("Redo poses", "poses:redo")]])
            choice = wait_tap(mid)
            if choice == "poses:ok" or choice is None:
                break
        for name, im in cut.items():
            im.save(OUT / f"{name}.png", optimize=True)
        (OUT / "mascot.json").write_text(json.dumps({
            "poses": sorted(cut), "model": os.environ.get("EDIT_MODEL", "black-forest-labs/FLUX.2-klein-4B"),
            "style": STYLE, "look": LOOK, "seed": seed_base,
        }, indent=2))
        say("Mascot saved. It will show up in the next reels.")


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    main()
