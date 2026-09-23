"""
O'z OCR xizmatimiz — Tesseract asosida, bepul va cheklovsiz.

Endpointlar:
  GET  /          — holat (uyg'otish uchun ham ishlatiladi)
  GET  /health    — qisqa holat
  POST /ocr       — rasmdan matn o'qish (X-Api-Key sarlavhasi talab qilinadi)
  GET  /stats     — statistika (X-Api-Key talab qilinadi)

Rasm uch xil usulda yuborilishi mumkin:
  - multipart 'file'
  - 'base64' (forma yoki JSON; "data:image/..;base64," prefiksi bilan yoki usiz)
  - 'url' (http/https)
"""
import base64
import hmac
import io
import os
import subprocess
import tempfile
import threading
import time
import urllib.request

from flask import Flask, jsonify, request
from PIL import Image, ImageOps, ImageStat

app = Flask(__name__)
app.json.ensure_ascii = False   # kirill matn \uXXXX emas, o'zicha qaytsin

SECRET       = os.environ.get("OCR_SECRET", "")
LANGS        = os.environ.get("OCR_LANGS", "uzb+rus")
PSM          = os.environ.get("OCR_PSM", "11")
MAX_BYTES    = int(os.environ.get("OCR_MAX_BYTES", str(8 * 1024 * 1024)))
MIN_SIDE     = int(os.environ.get("OCR_MIN_SIDE", "1200"))   # uzun tomoni kamida
MIN_SHORT    = int(os.environ.get("OCR_MIN_SHORT", "800"))   # qisqa tomoni kamida
MAX_SIDE     = int(os.environ.get("OCR_MAX_SIDE", "3000"))   # uzun tomoni ko'pi bilan
# 2 = Sauvola (lokal binarizatsiya). Rangli fondagi (masalan, Telegram'ning
# binafsha xabar pufagidagi) oq yozuvni global usul yo'qotib qo'yadi.
THRESH       = os.environ.get("OCR_THRESH", "2")
TESS_TIMEOUT = int(os.environ.get("OCR_TESS_TIMEOUT", "90"))
QUEUE_WAIT   = int(os.environ.get("OCR_QUEUE_WAIT", "60"))

# Bepul tarifda 0.1 CPU bor — bir vaqtda faqat bitta Tesseract ishlasin,
# aks holda ikkalasi ham sekinlashib timeout'ga tushadi.
_slot = threading.Semaphore(1)
_stats_lock = threading.Lock()
STARTED = time.time()
STATS = {"requests": 0, "success": 0, "errors": 0, "busy": 0, "total_ms": 0}


def _bump(key, ms=0):
    with _stats_lock:
        STATS[key] += 1
        STATS["total_ms"] += ms


def _authorized():
    if not SECRET:
        return True
    given = request.headers.get("X-Api-Key", "")
    return hmac.compare_digest(given.encode(), SECRET.encode())


def _read_image_bytes():
    """So'rovdan rasm baytlarini oladi. Xato bo'lsa (None, xabar, http_kod)."""
    f = request.files.get("file")
    if f is not None:
        data = f.read(MAX_BYTES + 1)
        return (data, None, None) if len(data) <= MAX_BYTES else (None, "rasm juda katta", 413)

    payload = request.get_json(silent=True) or {}
    b64 = request.form.get("base64") or payload.get("base64")
    if b64:
        if "," in b64[:100] and b64.lstrip().startswith("data:"):
            b64 = b64.split(",", 1)[1]
        try:
            data = base64.b64decode(b64, validate=False)
        except Exception:
            return None, "base64 noto'g'ri", 400
        return (data, None, None) if len(data) <= MAX_BYTES else (None, "rasm juda katta", 413)

    url = request.form.get("url") or payload.get("url")
    if url:
        if not (url.startswith("http://") or url.startswith("https://")):
            return None, "faqat http/https manzil", 400
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ocr-service"})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read(MAX_BYTES + 1)
        except Exception as e:
            return None, f"rasmni yuklab bo'lmadi: {e}", 400
        return (data, None, None) if len(data) <= MAX_BYTES else (None, "rasm juda katta", 413)

    return None, "rasm yuborilmadi (file / base64 / url)", 400


def _prepare(data):
    """Tesseract uchun rasmni tayyorlash: kulrang, o'lcham, kontrast."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        rgba = img.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        img = bg
    img = img.convert("L")

    # O'lcham: qisqa tomoni bo'yicha. Telefon skrinshoti ingichka va uzun
    # (masalan 574x1280) — uzun tomon bo'yicha kichraytirilsa harflar
    # juda maydalashib ketadi.
    w, h = img.size
    k = 1.0
    if min(w, h) < MIN_SHORT:
        k = MIN_SHORT / float(min(w, h))
    if max(w, h) * k < MIN_SIDE:
        k = MIN_SIDE / float(max(w, h))
    if max(w, h) * k > MAX_SIDE:
        k = MAX_SIDE / float(max(w, h))
    if abs(k - 1.0) > 0.01:
        img = img.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)

    # Qorong'i fonda och rangli yozuv (reklama bannerlarida ko'p) —
    # Tesseract qora-ustida-oq matnni yaxshiroq o'qiydi.
    if ImageStat.Stat(img).mean[0] < 110:
        img = ImageOps.invert(img)

    return ImageOps.autocontrast(img, cutoff=1)


def _tesseract(img):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
        img.save(tmp.name, format="PNG")
        cmd = ["tesseract", tmp.name, "stdout", "-l", LANGS, "--oem", "1", "--psm", PSM]
        if THRESH:
            cmd += ["-c", f"thresholding_method={THRESH}"]
        out = subprocess.run(cmd, capture_output=True, timeout=TESS_TIMEOUT,
                             env={**os.environ, "OMP_THREAD_LIMIT": "1"})
        if out.returncode != 0:
            raise RuntimeError(out.stderr.decode("utf-8", "replace")[-300:])
        return out.stdout.decode("utf-8", "replace").strip()


@app.get("/")
@app.get("/health")
def health():
    return jsonify(ok=True, service="ocr", langs=LANGS, psm=PSM, thresh=THRESH,
                   uptime_s=int(time.time() - STARTED))


@app.get("/stats")
def stats():
    if not _authorized():
        return jsonify(ok=False, error="ruxsat yo'q"), 401
    with _stats_lock:
        s = dict(STATS)
    s["avg_ms"] = int(s["total_ms"] / s["success"]) if s["success"] else 0
    return jsonify(ok=True, uptime_s=int(time.time() - STARTED), **s)


@app.post("/ocr")
def ocr():
    if not _authorized():
        return jsonify(ok=False, error="ruxsat yo'q"), 401

    _bump("requests")
    data, err, code = _read_image_bytes()
    if err:
        _bump("errors")
        return jsonify(ok=False, error=err), code

    if not _slot.acquire(timeout=QUEUE_WAIT):
        _bump("busy")
        return jsonify(ok=False, error="band — keyinroq urinib ko'ring"), 503

    t0 = time.time()
    try:
        img = _prepare(data)
        text = _tesseract(img)
    except subprocess.TimeoutExpired:
        _bump("errors")
        return jsonify(ok=False, error="OCR vaqti tugadi"), 504
    except Exception as e:
        _bump("errors")
        return jsonify(ok=False, error=f"OCR xatosi: {e}"), 500
    finally:
        _slot.release()

    ms = int((time.time() - t0) * 1000)
    _bump("success", ms)
    return jsonify(ok=True, text=text, ms=ms, langs=LANGS)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "10000")))
