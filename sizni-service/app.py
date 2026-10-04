"""
app.py — sizni_tekshir.py ni serverda (Render, bepul) ishlatish.

  - Veb-sahifa (telefondan ochiladi): Telegramga kirish (raqam → kod → parol),
    hisoblaydi bazasini yuklash, Boshlash / Davom / To'xtatish / Natija tugmalari,
    holat va oxirgi yozuvlar.
  - Ish ketayotganda xizmat o'zini o'zi "uyg'oq" tutadi (Render bepul xizmati
    15 daqiqa so'rov bo'lmasa uxlab qoladi). Ish tugagach — uxlashiga qo'yib beradi.
  - Holat har 5 daqiqada Telegramdagi "Saqlangan xabarlar"ga zaxiralanadi
    (#sizni_holat). Server qayta ishga tushsa — qayta kirasiz, ish to'xtagan
    joyidan davom etadi.

Muhit o'zgaruvchilari: API_ID, API_HASH, ADMIN_ID, GROUP_ID, WEB_KEY, SIZNI_WEB=1
"""
import asyncio
import collections
import html
import os
import time

os.environ.setdefault("SIZNI_WEB", "1")
import sizni_tekshir as H        # noqa: E402

from aiohttp import web, ClientSession, ClientTimeout   # noqa: E402
from pyrogram import enums, raw                          # noqa: E402
from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired, PasswordHashInvalid  # noqa: E402
from pyrogram.types import InputMediaDocument            # noqa: E402

WEB_KEY = os.environ.get("WEB_KEY", "")
PORT = int(os.environ.get("PORT", "10000"))
SELF_URL = os.environ.get("RENDER_EXTERNAL_URL", "")
STATE_TAG = "#sizni_holat"

client = H.app
LOGS = collections.deque(maxlen=60)
AUTH = {"ok": False, "phone": None, "hash": None, "need_password": False, "error": "", "busy_login": 0.0}
BACKUP = {"msg_id": None, "last": 0.0}

# --- H.log ni ushlab, veb-sahifada ko'rsatamiz ---
_orig_log = H.log


def _log(text):
    LOGS.append(time.strftime("%H:%M:%S ") + str(text))
    _orig_log(text)


H.log = _log


# --- Holatni Saqlangan xabarlarga zaxiralash (server qayta ishga tushsa yo'qolmasin) ---
_orig_save = H.save_state


def _save_state(st):
    _orig_save(st)
    if AUTH["ok"] and time.time() - BACKUP["last"] > 300:
        BACKUP["last"] = time.time()
        asyncio.get_event_loop().create_task(backup_state())


H.save_state = _save_state

# --- Ish tugagach ham 3 soat uyg'oq turadi (sinov javoblarini ko'rib "Davom" bosguncha sessiya yo'qolmasin) ---
ACT = {"last": time.time()}
_orig_start = H.start


async def _start(*a, **k):
    ACT["last"] = time.time()
    try:
        await _orig_start(*a, **k)
    finally:
        ACT["last"] = time.time()
        await backup_state()


H.start = _start


async def backup_state():
    if not os.path.exists(H.STATE_FILE):
        return
    try:
        if BACKUP["msg_id"]:
            await client.edit_message_media("me", BACKUP["msg_id"], InputMediaDocument(H.STATE_FILE, caption=STATE_TAG))
        else:
            m = await client.send_document("me", H.STATE_FILE, caption=STATE_TAG + " — o'chirmang, server qayta ishga tushsa shundan davom etadi")
            BACKUP["msg_id"] = m.id
    except Exception as e:
        _log(f"(holatni zaxiralab bo'lmadi: {e!r})")
        BACKUP["msg_id"] = None


async def restore_from_saved():
    """Kirgandan keyin: holat va baza serverda yo'q bo'lsa — Saqlangan xabarlardan olinadi."""
    try:
        if not os.path.exists(H.STATE_FILE):
            async for m in client.search_messages("me", query=STATE_TAG, limit=5):
                if m.document:
                    await m.download(file_name=os.path.join(H.BASE_DIR, H.STATE_FILE))
                    BACKUP["msg_id"] = m.id
                    _log("♻️ Holat Saqlangan xabarlardan tiklandi")
                    break
        else:
            async for m in client.search_messages("me", query=STATE_TAG, limit=1):
                BACKUP["msg_id"] = m.id
        if not os.path.exists(H.BASE_FILE):
            async for m in client.search_messages("me", filter=enums.MessagesFilter.DOCUMENT, limit=50):
                name = (m.document.file_name or "").lower() if m.document else ""
                if name.endswith(".json") and "holat" not in name and "boyitilgan" not in name:
                    await m.download(file_name=os.path.join(H.BASE_DIR, H.BASE_FILE))
                    _log(f"♻️ Baza Saqlangan xabarlardan olindi: {m.document.file_name}")
                    break
    except Exception as e:
        _log(f"(tiklashda xato: {e!r})")


async def ensure_peers():
    """Xotiradagi yangi sessiya guruhni hali "tanimaydi" — dialoglar orqali topib olamiz."""
    try:
        await client.get_chat(H.GROUP_ID)
        return True
    except Exception:
        pass
    async for d in client.get_dialogs():
        if d.chat and d.chat.id == H.GROUP_ID:
            return True
    return False


async def after_login():
    AUTH.update(ok=True, need_password=False, error="", phone=None, hash=None)
    await client.invoke(raw.functions.updates.GetState())
    client.me = await client.get_me()
    await client.initialize()               # buyruq va javoblarni qabul qilish boshlanadi
    found = await ensure_peers()
    _log("✅ Telegramga kirildi: " + (client.me.first_name or "") + ("" if found else " — ⚠️ guruh topilmadi!"))
    await restore_from_saved()
    st = H.load_state()
    if st and st.get("tested") and not finished(st):
        _log("🔄 Server qayta ishga tushgan — to'xtagan joydan davom etiladi")
        asyncio.get_event_loop().create_task(H.start(client, True))
    elif st and not st.get("scan_done"):
        asyncio.get_event_loop().create_task(H.start(client, True))


def finished(st):
    q = st.get("queue")
    if q is None:
        return False
    return all(u in st["results"] and not (st["results"][u]["status"] == "noanswer" and st["results"][u].get("tries", 1) < 2) for u in q)


# ---------------------------------------------------------------
#  UYG'OQ TUTISH
# ---------------------------------------------------------------
async def keep_alive():
    await asyncio.sleep(30)
    async with ClientSession(timeout=ClientTimeout(total=20)) as s:
        while True:
            active = H.busy.locked() or time.time() - ACT["last"] < 3 * 3600 \
                or (not AUTH["ok"] and time.time() - AUTH["busy_login"] < 1800)
            if active and SELF_URL:
                try:
                    await s.get(SELF_URL + "/ping")
                except Exception:
                    pass
            await asyncio.sleep(240)


# ---------------------------------------------------------------
#  VEB-SAHIFA
# ---------------------------------------------------------------
def page(body, key):
    k = html.escape(key)
    return web.Response(content_type="text/html", text=f"""<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sizni tekshiruv</title>
<style>body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#f4f6fa;color:#1d2330;line-height:1.5}}
h1{{font-size:20px}}input{{font-size:17px;padding:10px;border:1px solid #cfd5e1;border-radius:10px;width:100%;box-sizing:border-box;margin:6px 0}}
button,.b{{font-size:16px;padding:11px 16px;border:0;border-radius:10px;background:#2563eb;color:#fff;margin:4px 4px 4px 0;cursor:pointer}}
.g{{background:#e3e7ef;color:#1d2330}}.box{{background:#fff;border:1px solid #dde2ec;border-radius:12px;padding:12px;margin:12px 0}}
pre{{white-space:pre-wrap;font-size:12px;background:#0f172a;color:#cbd5e1;padding:10px;border-radius:10px;max-height:420px;overflow:auto}}
.err{{color:#b3261e;font-weight:600}}.ok{{color:#137333;font-weight:600}}</style></head><body>
<h1>🔎 Hisoblaydi /sizni tekshiruvi</h1>{body}
<p><a href="/?key={k}">🔄 Yangilash</a></p></body></html>""")


def form(action, key, inner, button):
    return f'<form method="post" action="{action}?key={html.escape(key)}">{inner}<button>{button}</button></form>'


async def index(request):
    key = request.query.get("key", "")
    if not WEB_KEY or key != WEB_KEY:
        msg = ("⚠️ Serverda WEB_KEY sozlanmagan." if not WEB_KEY
               else ("❌ Parol noto'g'ri." if key else ""))
        return web.Response(status=403, content_type="text/html", text=f"""<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Kirish</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:40px auto;padding:16px">
<h2>🔐 Sizni tekshiruvi</h2><p style="color:#b3261e">{html.escape(msg)}</p>
<form method="get" action="/"><p>Parolni kiriting:</p>
<input name="key" type="password" style="font-size:18px;padding:10px;width:100%;box-sizing:border-box">
<button style="font-size:17px;padding:10px 18px;margin-top:10px">Kirish</button></form></body></html>""")
    err = f'<p class="err">{html.escape(AUTH["error"])}</p>' if AUTH["error"] else ""
    if not AUTH["ok"]:
        if AUTH["need_password"]:
            body = form("/password", key, '<p>Akkauntda ikki bosqichli parol bor — uni kiriting:</p><input type="password" name="password">', "Kirish")
        elif AUTH["hash"]:
            body = form("/code", key, f'<p>Telegram ilovangizga kelgan <b>kodni</b> kiriting ({html.escape(AUTH["phone"] or "")}):</p>'
                                     '<input name="code" inputmode="numeric" autocomplete="one-time-code">', "Tasdiqlash")
        else:
            body = form("/phone", key, '<p>Telegramga kirish: ADMIN akkauntining telefon raqami (+998...):</p><input name="phone" inputmode="tel" placeholder="+998901234567">', "Kod yuborish")
        return page(err + '<div class="box">' + body + '</div>', key)

    base = H.load_base()
    status = H.state_summary()
    running = H.busy.locked()
    btns = (form("/action", key, '<input type="hidden" name="do" value="start"><input name="months" value="6" style="width:80px"> oy ', "▶️ Boshlash")
            + form("/action", key, '<input type="hidden" name="do" value="resume">', "⏩ Davom (sinovdan keyin ham)")
            + form("/action", key, '<input type="hidden" name="do" value="retry">', "🔁 Faqat javobsizlarni qayta tekshirish")
            + form("/action", key, '<input type="hidden" name="do" value="stop">', "⏹ To'xtatish")
            + form("/action", key, '<input type="hidden" name="do" value="result">', "📦 Natijani Telegramga yuborish"))
    up = (f'<form method="post" enctype="multipart/form-data" action="/upload?key={html.escape(key)}">'
          '<p>Hisoblaydi bazasi (JSON) — yoki faylni Telegramda "Saqlangan xabarlar"ga yuboring:</p>'
          '<input type="file" name="file" accept=".json,application/json"><button class="g">📥 Yuklash</button></form>')
    body = (err + f'<div class="box"><p class="ok">✅ Telegramga kirilgan</p>'
            f'<p>📦 Baza: <b>{len(base) if base is not None else "yuklanmagan"}</b>{" ta" if base is not None else ""}<br>'
            f'📊 {html.escape(status)}<br>{"⏳ <b>Ish ketyapti</b>" if running else "💤 Ish to‘xtagan"}</p></div>'
            f'<div class="box">{btns}</div><div class="box">{up}</div>'
            f'<pre>{html.escape(chr(10).join(LOGS))}</pre>')
    return page(body, key)


def guard(request):
    return WEB_KEY and request.query.get("key", "") == WEB_KEY


def back(request):
    raise web.HTTPFound("/?key=" + request.query.get("key", ""))


async def post_phone(request):
    if not guard(request):
        return web.Response(status=403)
    data = await request.post()
    phone = "".join(ch for ch in str(data.get("phone", "")) if ch.isdigit() or ch == "+")
    AUTH["busy_login"] = time.time()
    try:
        if not client.is_connected:
            await client.connect()
        sent = await client.send_code(phone)
        AUTH.update(phone=phone, hash=sent.phone_code_hash, error="")
    except Exception as e:
        AUTH["error"] = f"Kod yuborilmadi: {e.__class__.__name__} {e}"
    back(request)


async def post_code(request):
    if not guard(request):
        return web.Response(status=403)
    data = await request.post()
    code = "".join(ch for ch in str(data.get("code", "")) if ch.isdigit())
    try:
        await client.sign_in(AUTH["phone"], AUTH["hash"], code)
        await after_login()
    except SessionPasswordNeeded:
        AUTH.update(need_password=True, error="")
    except (PhoneCodeInvalid, PhoneCodeExpired) as e:
        AUTH.update(error=f"Kod noto'g'ri yoki eskirgan ({e.__class__.__name__}). Qaytadan raqam kiriting.", hash=None)
    except Exception as e:
        AUTH["error"] = f"Kirib bo'lmadi: {e.__class__.__name__} {e}"
    back(request)


async def post_password(request):
    if not guard(request):
        return web.Response(status=403)
    data = await request.post()
    try:
        await client.check_password(str(data.get("password", "")))
        await after_login()
    except PasswordHashInvalid:
        AUTH["error"] = "Parol noto'g'ri."
    except Exception as e:
        AUTH["error"] = f"Kirib bo'lmadi: {e.__class__.__name__} {e}"
    back(request)


async def post_action(request):
    if not guard(request) or not AUTH["ok"]:
        return web.Response(status=403)
    data = await request.post()
    do = data.get("do")
    loop = asyncio.get_event_loop()
    if do == "start":
        m = str(data.get("months", "6"))
        months = int(m) if m.isdigit() and 1 <= int(m) <= 36 else H.MONTHS
        loop.create_task(H.start(client, False, months))
    elif do == "resume":
        loop.create_task(H.start(client, True))
    elif do == "retry":
        loop.create_task(H.start(client, True, retry=True))
    elif do == "stop":
        H.STOP["flag"] = True
        _log("⏹ To'xtatish so'raldi")
    elif do == "result":
        base, st = H.load_base(), H.load_state()
        if base is not None and st:
            H.save_outputs(base, st)
            loop.create_task(H.send_files(client))
    await asyncio.sleep(0.5)
    back(request)


async def post_upload(request):
    if not guard(request) or not AUTH["ok"]:
        return web.Response(status=403)
    if H.busy.locked():
        AUTH["error"] = "Ish ketayotganda bazani almashtirib bo'lmaydi — avval To'xtatish."
        back(request)
    data = await request.post()
    f = data.get("file")
    if f is None or not getattr(f, "file", None):
        AUTH["error"] = "Fayl tanlanmadi."
        back(request)
    raw_bytes = f.file.read()
    tmp = os.path.join(H.BASE_DIR, "baza_yuklandi.tmp")
    with open(tmp, "wb") as out:
        out.write(raw_bytes)
    try:
        if os.path.exists(H.BASE_FILE):
            os.replace(H.BASE_FILE, f"hisoblaydi_baza_eski_{time.strftime('%Y%m%d_%H%M%S')}.json")
        os.replace(tmp, H.BASE_FILE)
        n = len(H.load_base() or {})
        AUTH["error"] = ""
        _log(f"📥 Baza yuklandi: {n} ta")
        try:
            await client.send_document("me", H.BASE_FILE, caption=f"hisoblaydi_baza.json — {n} ta (tekshiruv uchun)")
        except Exception:
            pass
    except Exception as e:
        AUTH["error"] = f"Faylni o'qib bo'lmadi: {e}"
    back(request)


async def ping(request):
    return web.Response(text="ok")


async def main():
    webapp = web.Application(client_max_size=50 * 1024 * 1024)
    webapp.add_routes([web.get("/", index), web.get("/ping", ping), web.post("/phone", post_phone),
                       web.post("/code", post_code), web.post("/password", post_password),
                       web.post("/action", post_action), web.post("/upload", post_upload)])
    runner = web.AppRunner(webapp)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    _log(f"Veb-sahifa ishga tushdi (port {PORT}). Kirish: /?key=...")
    asyncio.get_event_loop().create_task(keep_alive())
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(main())
