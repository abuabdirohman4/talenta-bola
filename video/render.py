"""Render video.html -> out/promo.mp4.

  python render.py                 # render penuh + audio
  python render.py check [t ...]   # screenshot detik tertentu (default: tengah tiap adegan) + contact sheet
"""
import sys, os, re, json, glob, subprocess, asyncio
from urllib.parse import quote
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
FPS = 30
mode = sys.argv[1] if len(sys.argv) > 1 else "full"
CHROME = next(iter(sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome")))), None)


def sh(*a):
    return subprocess.run(a, check=True, capture_output=True, text=True)


def vo_timing():
    """Awal tiap kalimat VO (silencedetect) -> awal adegan. None kalau tidak ada vo.mp3."""
    if not os.path.exists("vo.mp3"):
        return None
    dur = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "vo.mp3").stdout)
    log = subprocess.run(["ffmpeg", "-i", "vo.mp3", "-af", "silencedetect=noise=-35dB:d=0.35", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [0.0] + [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log) if float(x) < dur - 0.3]
    if len(starts) != 8:
        print(f"! VO punya {len(starts)} kalimat, butuh 8 (satu per adegan). Pakai timing bawaan.")
        return None
    # adegan mulai 0,3 dtk sebelum kalimatnya; adegan terakhir ditahan 3 dtk setelah VO habis
    return {"s": [0.0] + [round(s - 0.3, 2) for s in starts[1:]], "dur": round(dur + 3, 2)}


async def main():
    timing = vo_timing()
    url = "file://" + os.path.join(HERE, "video.html") + ("#" + quote(json.dumps(timing)) if timing else "")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto(url)
        await pg.evaluate("Promise.all([document.fonts.load('800 80px \"Plus Jakarta Sans\"'), document.fonts.load('80px Anton')]).then(() => document.fonts.ready)")
        await pg.wait_for_timeout(500)
        dur = await pg.evaluate("DUR")
        if mode == "check":
            os.makedirs("check", exist_ok=True)
            ts = [float(x) for x in sys.argv[2:]] or await pg.evaluate("Object.values(T).map(([a,b])=>+((a+b)/2).toFixed(1))")
            paths = []
            for t in ts:
                await pg.evaluate(f"seek({t})")
                paths.append(f"check/t{t:05.1f}.jpg")
                await pg.screenshot(path=paths[-1], type="jpeg", quality=80)
            sheet(paths)
        else:
            os.makedirs("out", exist_ok=True)
            ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                                   "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "out/silent.mp4"], stdin=subprocess.PIPE)
            for i in range(int(FPS * dur)):
                await pg.evaluate(f"seek({i / FPS})")
                ff.stdin.write(await pg.screenshot(type="jpeg", quality=95))
                if i % 150 == 0: print(i, flush=True)
            ff.stdin.close(); ff.wait()
        await b.close()
    if mode != "check":
        mux(dur)


def sheet(paths):
    from PIL import Image, ImageDraw
    w, h = 270, 480
    s = Image.new("RGB", (w * min(4, len(paths)), h * ((len(paths) + 3) // 4)), "white")
    for i, p in enumerate(paths):
        im = Image.open(p).resize((w, h))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, w - 1, 50], outline="red"); d.rectangle([0, h - 75, w - 1, h - 1], outline="red")  # zona UI Reels
        d.text((6, 54), os.path.basename(p), fill="red")
        s.paste(im, ((i % 4) * w, (i // 4) * h))
    s.save("check/sheet.jpg", quality=85)
    print("check/sheet.jpg")


def mux(dur):
    if os.path.exists("music.mp3"):
        bg = ["-stream_loop", "-1", "-i", "music.mp3"]
    else:
        sh(sys.executable, "audio.py", str(dur))
        bg = ["-i", "music.wav"]
    fade = f"atrim=0:{dur},afade=t=in:d=0.05,afade=t=out:st={dur - 3}:d=3"
    if os.path.exists("vo.mp3"):
        inputs = bg + ["-i", "vo.mp3"]
        fc = (f"[1:a]{fade},volume=0.6[bg];[2:a]apad,atrim=0:{dur},asplit[vo][sc];"
              "[bg][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];"
              "[duck][vo]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=11[a]")
    else:
        inputs = bg
        fc = f"[1:a]{fade},loudnorm=I=-18:TP=-1.5:LRA=11[a]"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", "out/silent.mp4", *inputs, "-filter_complex", fc,
       "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "out/promo.mp4")
    print("out/promo.mp4")


asyncio.run(main())
