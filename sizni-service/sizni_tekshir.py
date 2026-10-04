"""
sizni_tekshir.py — hisoblaydi bazasini to'ldirish.

Nima qiladi:
  1. Sizdan hisoblaydi_baza.json ni oladi (Telegramda faylni yuborasiz) yoki
     shu papkadagi hisoblaydi_baza.json ni ishlatadi.
  2. Guruhda oxirgi 6 oyda kim yozgan bo'lsa — ro'yxat qiladi (ID + oxirgi xabarlari).
  3. Bazada BOR ID larni ro'yxatdan chiqaradi (adminlar ham chiqariladi).
  4. Qolganlarning har birining xabariga "/sizni@HisoblaydiBot" deb reply qiladi,
     hisoblaydi javobini o'qiydi va ikkala xabarni darhol o'chiradi.
     Odam qo'shgan bo'lsa (1 va undan ko'p) — bazaga qo'shadi, qo'shmaganlarni qo'shmaydi.
  5. Oxirida boyitilgan bazani sizga yuboradi.

SERVERDA (Render) app.py orqali ishlaydi: Telegramga kirish veb-sahifada.
API_ID, API_HASH, ADMIN_ID, GROUP_ID — muhit o'zgaruvchilaridan.

Telegramda (ADMIN_ID akkauntidan, shaxsiy chatda yoki "Saqlangan xabarlar"da):
    hisoblaydi_baza.json faylini yuboring  — tekshiriladigan baza
    /sizni_boshla     — boshlash (6 oylik tarix o'qiladi, keyin tekshiruv)
    /sizni_boshla 3   — oxirgi 3 oy
    /sizni_davom      — to'xtagan joydan davom etish (sinov javoblarini ko'rib chiqqandan keyin ham)
    /sizni_toxtat     — to'xtatish (hammasi saqlanadi)
    /sizni_holat      — qayerga yetgani
    /sizni_natija     — hozirgacha boyitilgan bazani darhol olish

Muhim:
  - Hisoblaydibot guruhda turishi va /sizni ga javob berishi kerak.
  - Dastlab 3 kishi tekshiriladi va hisoblaydi javoblari sizga ko'rsatiladi —
    to'g'ri o'qilgan bo'lsa /sizni_davom bilan davom ettirasiz.
  - Reply qilingan a'zoga Telegram ovozsiz bildirishnoma yuborishi mumkin
    (xabar darhol o'chiriladi). Kechasi ishga tushirish ma'qul.
"""
import asyncio
import json
import os
import random
import re
import sys
import time

# ---------- Windows CMD va turli Python versiyalari uchun moslash ----------
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

from pyrogram import Client, filters
from pyrogram.errors import FloodWait

# ===================== SOZLAMALAR =====================
# Serverda (Render) maxfiy qiymatlar muhit o'zgaruvchilaridan olinadi — kodda saqlanmaydi.
API_ID = int(os.environ.get("API_ID", "0") or 0)
API_HASH = os.environ.get("API_HASH", "")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "1416382118"))  # buyruqlar shu profildan, hisobot va fayl shu profilga
TARGET_BOT = os.environ.get("TARGET_BOT", "HisoblaydiBot")
GROUP_ID = int(os.environ.get("GROUP_ID", "-1001589226429"))
SESSION = "sizni_server"
IN_MEMORY = bool(os.environ.get("SIZNI_WEB"))   # serverda sessiya xotirada (kirish veb-sahifa orqali)
# Serverda hisobot va fayllar kirilgan akkauntning o'z "Saqlangan xabarlar"iga boradi
# (boshqa akkauntdan kirilgan bo'lsa ADMIN_ID ni u "tanimasligi" mumkin).
REPORT_TO = "me" if IN_MEMORY else ADMIN_ID

BASE_FILE = "hisoblaydi_baza.json"               # kirish: hisoblaydi bazasi
OUT_FILE = "hisoblaydi_baza_boyitilgan.json"     # chiqish: boyitilgan baza
REPORT_FILE = "sizni_natija.txt"                 # kim qancha, kim javobsiz
STATE_FILE = "sizni_holat.json"                  # davom ettirish uchun

MONTHS = 6             # necha oylik tarix o'qiladi
DELAY = (7, 11)        # har bir tekshiruv orasida (soniya, tasodifiy)
PAUSE_EVERY = 40       # har shuncha tekshiruvdan keyin dam
PAUSE_SEC = (90, 150)  # dam olish (soniya)
ANSWER_WAIT = 20       # hisoblaydi javobini ko'pi bilan necha soniya kutish
POLL = 2.5             # javob kelmasa guruhni o'zimiz necha soniyada bir tekshiramiz
TEST_FIRST = 3         # dastlab shuncha kishini tekshirib, javoblarni ko'rsatib to'xtaydi
MAX_SILENT = 6         # hisoblaydi ketma-ket shuncha marta javob bermasa — dam olib qayta urinadi
MSGS_PER_USER = 3      # har bir a'zoning nechta oxirgi xabari eslab qolinadi (biri o'chgan bo'lsa)
SAVE_EVERY = 10

app = Client(SESSION, api_id=API_ID, api_hash=API_HASH, workdir=BASE_DIR, in_memory=IN_MEMORY)
busy = asyncio.Lock()
STOP = {"flag": False}
PENDING = {}     # bizning /sizni xabarimiz ID si → (Future, a'zo xabari ID si, a'zo ID si)
CMD_TEXT = f"/sizni@{TARGET_BOT}"


def log(text):
    print(time.strftime("%H:%M:%S"), text, flush=True)


async def report(client, text):
    log(text.replace("**", ""))
    try:
        return await client.send_message(REPORT_TO, text)
    except Exception as e:
        log(f"   (hisobotni yuborib bo'lmadi: {e!r})")


async def flood_safe(make, what, tries=6):
    """FloodWait bo'lsa kutib, tarmoq uzilishida esa bir necha marta qayta urinadi."""
    attempt = 0
    while True:
        try:
            return await make()
        except FloodWait as e:
            log(f"⚠️ Telegram cheklovi ({what}): {e.value} s kutilmoqda...")
            await asyncio.sleep(e.value + 1)
        except (OSError, TimeoutError, asyncio.TimeoutError, ConnectionError) as e:
            attempt += 1
            if attempt >= tries:
                raise
            log(f"⚠️ Tarmoq xatosi ({what}): {e!r} — {attempt * 5} s dan keyin qayta...")
            await asyncio.sleep(attempt * 5)


def is_target(msg):
    u = getattr(msg, "from_user", None)
    return bool(u and u.username and u.username.lower() == TARGET_BOT.lower())


def full_name(u):
    return " ".join(x for x in [getattr(u, "first_name", "") or "", getattr(u, "last_name", "") or ""] if x).strip()


# ---------------------------------------------------------------
#  BAZA VA HOLAT
# ---------------------------------------------------------------
def load_base():
    """{"123": {"score": 25, "name": "Ali"}, ...} — boshqa ko'rinishlar ham o'qiladi."""
    if not os.path.exists(BASE_FILE):
        return None
    with open(BASE_FILE, encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, dict) and isinstance(d.get("users"), dict):
        d = d["users"]
    out = {}
    items = d.items() if isinstance(d, dict) else ((str(r.get("id", "")), r) for r in d if isinstance(r, dict))
    for k, v in items:
        if isinstance(v, dict):
            uid, score, name = v.get("id", v.get("user_id", k)), v.get("score", v.get("count", v.get("n"))), v.get("name", "")
        else:
            uid, score, name = k, v, ""
        try:
            uid, score = int(uid), int(score)
        except (TypeError, ValueError):
            continue
        if uid > 0:
            out[str(uid)] = {"score": score, "name": name or ""}
    return out


def new_state(months):
    return {"months": months, "cutoff": time.time() - months * 30 * 86400,
            "scan_done": False, "cursor": 0, "seen": 0,
            "writers": {}, "queue": None, "results": {}, "tested": False}


def load_state():
    if not os.path.exists(STATE_FILE):
        return None
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_state(st):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False)
    os.replace(tmp, STATE_FILE)


def enriched(base, st):
    out = dict(base)
    for uid, r in st["results"].items():
        n = r.get("n")
        if isinstance(n, int) and n > 0 and (uid not in out or n > out[uid]["score"]):
            out[uid] = {"score": n, "name": st["writers"].get(uid, {}).get("name", "")}
    return out


def save_outputs(base, st):
    out = enriched(base, st)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    groups = {"ok": [], "zero": [], "noanswer": [], "nomsg": [], "unknown": []}
    for uid, r in st["results"].items():
        groups.setdefault(r.get("status", "unknown"), []).append((uid, r))
    lines = [f"Boyitilgan baza: {len(out)} ta (hisoblaydi bazasida edi: {len(base)}, qo'shildi: {len(out) - len(base)})", ""]
    titles = {"ok": "✅ ODAM QO'SHGANLAR (bazaga qo'shildi)", "zero": "➖ QO'SHMAGANLAR (qo'shilmadi)",
              "noanswer": "⏳ HISOBLAYDI JAVOB BERMADI", "nomsg": "🗑 XABARI QOLMAGAN (tekshirib bo'lmadi)",
              "unknown": "❓ JAVOBNI TUSHUNIB BO'LMADI"}
    for key, title in titles.items():
        rows = groups.get(key, [])
        lines.append(f"{title}: {len(rows)} ta")
        for uid, r in rows:
            nm = st["writers"].get(uid, {}).get("name", "")
            extra = f" — {r['n']} ta" if key == "ok" else (f" — «{r.get('raw', '')[:80]}»" if key == "unknown" else "")
            lines.append(f"  {uid}  {nm}{extra}")
        lines.append("")
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out


# ---------------------------------------------------------------
#  HISOBLAYDI JAVOBINI O'QISH
# ---------------------------------------------------------------
APOS = str.maketrans({"ʻ": "'", "ʼ": "'", "‘": "'", "’": "'", "`": "'", "´": "'"})


def parse_count(text):
    """"🔹 25 ta odam qo'shgan!" → 25;  "❌ hali odam qo'shmagan!" → 0;  tushunarsiz → None.
    Hisoblaydi birinchi qatorga a'zoning ismini yozadi (ismda raqam bo'lishi mumkin) —
    shuning uchun "odam" so'zi bor qator o'qiladi."""
    t = (text or "").translate(APOS).casefold()
    lines = [ln for ln in t.splitlines() if "odam" in ln]
    if lines:
        t = lines[-1]
    m = re.search(r"(\d+)\s*ta\s+odam", t) or re.search(r"(\d+)\s*ta\b", t)
    if m:
        return int(m.group(1))
    if "qo'shmagan" in t or "qoshmagan" in t or "hali odam" in t:
        return 0
    return None


def is_answer_for(msg, cmd_id, member_msg_id, uid):
    """Hisoblaydining shu xabari bizning /sizni ga javobmi?
    Hisoblaydi javobni reply qilmasdan yozadi: birinchi qatorda a'zoning ismi havola
    (ID si bilan). Shuning uchun: reply bo'lsa — reply bo'yicha, bo'lmasa — ismdagi ID bo'yicha."""
    if not is_target(msg) or msg.id <= cmd_id:
        return False
    rid = getattr(msg, "reply_to_message_id", None)
    if rid in (cmd_id, member_msg_id):
        return True
    return uid is not None and int(uid) in mentioned_ids(msg)


def deliver_answer(msg):
    """Hisoblaydi guruhga yozdi — bizning /sizni ga javobmi?"""
    if not is_target(msg):
        return False
    for cmd_id, (fut, mid, uid) in list(PENDING.items()):
        if not fut.done() and is_answer_for(msg, cmd_id, mid, uid):
            fut.set_result(msg)
            return True
    return False


@app.on_message(filters.chat(GROUP_ID))
async def on_group_message(client, msg):
    deliver_answer(msg)


async def wait_answer(client, cmd_id, member_msg_id, uid):
    """Javobni yangilik orqali kutamiz; kelmasa guruhning oxirgi xabarlarini o'zimiz tekshiramiz."""
    fut = asyncio.get_event_loop().create_future()
    PENDING[cmd_id] = (fut, member_msg_id, uid)
    deadline = time.time() + ANSWER_WAIT
    try:
        while time.time() < deadline:
            try:
                return await asyncio.wait_for(asyncio.shield(fut), timeout=POLL)
            except asyncio.TimeoutError:
                pass
            try:
                async def recent():
                    return [m async for m in client.get_chat_history(GROUP_ID, limit=15)]
                for m in await flood_safe(recent, "javobni tekshirish"):
                    if is_answer_for(m, cmd_id, member_msg_id, uid):
                        return m
            except Exception as e:
                log(f"   (guruhni tekshirib bo'lmadi: {e!r})")
        return None
    finally:
        PENDING.pop(cmd_id, None)


# ---------------------------------------------------------------
#  1-BOSQICH: oxirgi N oyda kim yozgan
# ---------------------------------------------------------------
async def scan_history(client, st):
    log(f"📜 Guruh tarixi o'qilmoqda (oxirgi {st['months']} oy)...")
    writers = st["writers"]
    cutoff = st["cutoff"]
    count = 0
    done = False

    async def batch():
        nonlocal count, done
        async for m in client.get_chat_history(GROUP_ID, offset_id=st["cursor"] or 0):
            st["cursor"] = m.id
            if m.date and m.date.timestamp() < cutoff:
                done = True
                return
            st["seen"] += 1
            count += 1
            u = getattr(m, "from_user", None)
            if u and not u.is_bot and not getattr(m, "sender_chat", None) and not getattr(m, "service", None) \
                    and not getattr(u, "is_deleted", False):
                w = writers.setdefault(str(u.id), {"name": full_name(u), "msgs": [], "t": m.date.timestamp() if m.date else 0})
                if len(w["msgs"]) < MSGS_PER_USER:
                    w["msgs"].append(m.id)
            if count % 3000 == 0:
                save_state(st)
                log(f"   ...{st['seen']} ta xabar, {len(writers)} ta yozgan a'zo")
            if STOP["flag"]:
                return
        done = True     # tarix tugadi

    while not done and not STOP["flag"]:
        try:
            await flood_safe(batch, "guruh tarixi")
        except FloodWait as e:
            await asyncio.sleep(e.value + 1)
    st["scan_done"] = done
    save_state(st)
    return done


# ---------------------------------------------------------------
#  2-BOSQICH: kimni tekshirish kerak
# ---------------------------------------------------------------
async def build_queue(client, st, base):
    admins = set()
    try:
        from pyrogram.enums import ChatMembersFilter
        async def get_admins():
            return [m.user.id async for m in client.get_chat_members(GROUP_ID, filter=ChatMembersFilter.ADMINISTRATORS) if m.user]
        admins = set(await flood_safe(get_admins, "adminlar"))
    except Exception as e:
        log(f"   (adminlar ro'yxatini olib bo'lmadi: {e!r})")
    me = await client.get_me()
    skip_base = skip_admin = 0
    q = []
    for uid, w in st["writers"].items():
        if uid in base:
            skip_base += 1
            continue
        if int(uid) in admins or int(uid) in (ADMIN_ID, me.id):
            skip_admin += 1
            continue
        q.append(uid)
    q.sort(key=lambda u: -st["writers"][u].get("t", 0))   # eng yaqinda yozganlar birinchi
    st["queue"] = q
    save_state(st)
    return skip_base, skip_admin


async def first_existing_msg(client, st, uids):
    """Har bir a'zoning hali o'chirilmagan bitta xabarini topish (100 tadan to'plab so'raladi)."""
    want = {}
    for uid in uids:
        for mid in st["writers"][uid]["msgs"]:
            want.setdefault(mid, uid)
    found = {}
    ids = list(want)
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        msgs = await flood_safe(lambda: client.get_messages(GROUP_ID, chunk), "xabarlar")
        for m in (msgs if isinstance(msgs, list) else [msgs]):
            if m and not getattr(m, "empty", False) and getattr(m, "from_user", None):
                uid = want.get(m.id)
                if uid and uid not in found:
                    found[uid] = m.id
    return found


# ---------------------------------------------------------------
#  3-BOSQICH: /sizni bilan tekshirish
# ---------------------------------------------------------------
def mentioned_ids(msg):
    """Javobda kim tilga olingan (ismi havola bo'lsa — ID si)"""
    ids = set()
    for e in (getattr(msg, "entities", None) or []):
        u = getattr(e, "user", None)
        if u is not None:
            ids.add(int(u.id))
        m = re.search(r"tg://user\?id=(\d+)", getattr(e, "url", None) or "")
        if m:
            ids.add(int(m.group(1)))
    return ids


async def check_one(client, st, uid, mid):
    cmd = await flood_safe(lambda: client.send_message(GROUP_ID, CMD_TEXT, reply_to_message_id=mid,
                                                        disable_notification=True), "/sizni")
    # A'zoning xabari shu orada o'chirilgan bo'lsa Telegram buyruqni reply'siz yuboradi —
    # unda hisoblaydi BIZNING hisobimizni aytadi. Bunday javobni olmaymiz.
    if getattr(cmd, "reply_to_message_id", None) != mid:
        me = getattr(client, "me", None) or await client.get_me()
        stray = await wait_answer(client, cmd.id, cmd.id, me.id)   # u bizning o'zimiz haqida javob beradi — u ham guruhda qolmasin
        try:
            await client.delete_messages(GROUP_ID, [cmd.id] + ([stray.id] if stray else []))
        except Exception:
            pass
        return {"n": None, "status": "nomsg"}
    ans = await wait_answer(client, cmd.id, mid, uid)
    to_del = [cmd.id] + ([ans.id] if ans else [])
    try:
        await client.delete_messages(GROUP_ID, to_del)
    except Exception:
        try:
            await client.delete_messages(GROUP_ID, [cmd.id])
        except Exception:
            pass
    if ans is None:
        return {"n": None, "status": "noanswer"}
    raw = ans.text or ans.caption or ""
    who = mentioned_ids(ans)
    if who and int(uid) not in who:      # javob boshqa odam haqida — olmaymiz
        return {"n": None, "status": "unknown", "raw": "boshqa odam haqida: " + raw[:250]}
    n = parse_count(raw)
    if n is None:
        return {"n": None, "status": "unknown", "raw": raw[:300]}
    return {"n": n, "status": "ok" if n > 0 else "zero", "raw": raw[:120]}


async def am_i_admin(client):
    try:
        me = await client.get_chat_member(GROUP_ID, "me")
    except Exception as e:
        return False, f"guruhdagi huquqlarni bilib bo'lmadi ({e.__class__.__name__})"
    status = str(getattr(me, "status", "")).lower()
    if "owner" in status or "creator" in status:
        return True, ""
    if "administrator" not in status:
        return False, "bu akkaunt guruhda admin emas"
    priv = getattr(me, "privileges", None)
    if priv is not None and not getattr(priv, "can_delete_messages", False):
        return False, "bu akkaunt admin, lekin «Xabarlarni o'chirish» huquqi yo'q"
    return True, ""


async def sweep_leftovers(client, st):
    """Oldingi (o'qilmay qolgan) hisoblaydi javoblarini topib, natijaga yozadi va o'chiradi."""
    want = {int(u) for u, r in st["results"].items() if r.get("status") == "noanswer"}
    queue = {int(u) for u in (st.get("queue") or [])}
    found, to_del = 0, []
    try:
        async def recent():
            return [m async for m in client.get_chat_history(GROUP_ID, limit=400)]
        for m in await flood_safe(recent, "eski javoblar"):
            if not is_target(m):
                continue
            raw = m.text or m.caption or ""
            n = parse_count(raw)
            if n is None or "kerak" in raw.casefold():
                continue
            ids = mentioned_ids(m) & queue
            if len(ids) != 1:
                continue
            uid = next(iter(ids))
            to_del.append(m.id)
            if uid in want:
                st["results"][str(uid)] = {"n": n, "status": "ok" if n > 0 else "zero", "raw": raw[:120]}
                want.discard(uid)
                found += 1
        if to_del:
            await client.delete_messages(GROUP_ID, to_del)
    except Exception as e:
        log(f"   (eski javoblarni tozalab bo'lmadi: {e!r})")
    if to_del:
        log(f"🧹 Guruhda qolgan {len(to_del)} ta hisoblaydi javobi o'chirildi ({found} tasi natijaga yozildi)")
        save_state(st)


async def check_all(client, st, base):
    await sweep_leftovers(client, st)
    todo = [u for u in st["queue"] if u not in st["results"]
            or (st["results"][u]["status"] == "noanswer" and st["results"][u].get("tries", 1) < 2)]
    total = len(st["queue"])
    log(f"🔎 Tekshiruv: {len(todo)} ta qoldi (jami {total})")
    done_now = silent = rests = 0
    for i in range(0, len(todo), 50):
        part = todo[i:i + 50]
        existing = await first_existing_msg(client, st, part)
        for uid in part:
            if STOP["flag"]:
                save_state(st)
                return "stopped"
            mid = existing.get(uid)
            if not mid:
                st["results"][uid] = {"n": None, "status": "nomsg"}
                continue
            try:
                res = await check_one(client, st, uid, mid)
            except Exception:
                save_state(st)      # nima bo'lsa ham — natijalar yo'qolmasin
                raise
            prev = st["results"].get(uid, {})
            if res["status"] == "noanswer" and prev.get("status") == "noanswer":
                res["tries"] = prev.get("tries", 1) + 1
            st["results"][uid] = res
            done_now += 1
            name = st["writers"][uid].get("name", "")
            log(f"   [{len(st['results'])}/{total}] {uid} {name}: " +
                {"ok": f"{res.get('n')} ta ✅", "zero": "0", "noanswer": "javob yo'q ⏳", "unknown": "tushunarsiz ❓",
                 "nomsg": "xabari o'chgan 🗑"}.get(res["status"], res["status"]))

            if res["status"] == "noanswer":
                silent += 1
                if silent >= MAX_SILENT:
                    rests += 1
                    if rests >= 3:
                        save_state(st)
                        await report(client, "⛔️ Hisoblaydi javob bermayapti (3 marta dam olib urinildi). To'xtadim.\n"
                                             "Hisoblaydibot guruhdami? Keyinroq /sizni_davom.")
                        return "stopped"
                    await report(client, f"⏸ Hisoblaydi ketma-ket {silent} marta javob bermadi — 10 daqiqa dam olaman.")
                    await asyncio.sleep(600)
                    silent = 0
            else:
                silent = 0

            # Dastlabki sinov: javoblar to'g'ri o'qilyaptimi — sizga ko'rsatib to'xtaydi
            if not st["tested"]:
                answered = [(u, r) for u, r in st["results"].items() if r["status"] in ("ok", "zero", "unknown")]
                if len(answered) >= TEST_FIRST:
                    st["test_shown"] = True
                    save_state(st)
                    lines = [f"• {st['writers'][u].get('name', '')} ({u}): «{r.get('raw', '')[:100]}» → "
                             + (f"**{r['n']} ta**" if r["n"] is not None else "**tushunarsiz**") for u, r in answered]
                    await report(client, "🧪 **SINOV:** hisoblaydi javoblari va bot ularni qanday o'qidi:\n\n" + "\n".join(lines) +
                                 "\n\nTo'g'ri bo'lsa — /sizni_davom (qolganlari tekshiriladi).\n"
                                 "Noto'g'ri bo'lsa — to'xtab turing va menga shu xabarni yuboring.")
                    return "test"

            if done_now % SAVE_EVERY == 0:
                save_state(st)
            if done_now % 200 == 0:
                ok = sum(1 for r in st["results"].values() if r["status"] == "ok")
                await report(client, f"📊 {len(st['results'])}/{total} tekshirildi, odam qo'shganlar: {ok} ta")
            if done_now % PAUSE_EVERY == 0:
                p = random.randint(*PAUSE_SEC)
                log(f"   ☕ {p} s dam")
                await asyncio.sleep(p)
            else:
                await asyncio.sleep(random.uniform(*DELAY))
    save_state(st)
    # Javob bermaganlar bir marta qayta tekshiriladi
    again = [u for u, r in st["results"].items() if r["status"] == "noanswer" and r.get("tries", 1) < 2]
    if again and not STOP["flag"]:
        log(f"🔁 Javob bermaganlar qayta: {len(again)} ta")
        return await check_all(client, st, base)
    return "done"


# ---------------------------------------------------------------
#  BOSHQARUV
# ---------------------------------------------------------------
async def run(client, resume, months=MONTHS):
    base = load_base()
    if base is None:
        await report(client, f"❗️ `{BASE_FILE}` topilmadi. Avval hisoblaydi bazasini (JSON fayl) shu chatga yuboring.")
        return
    st = load_state() if resume else None
    if st is None:
        if os.path.exists(STATE_FILE):
            os.replace(STATE_FILE, f"sizni_holat_zaxira_{time.strftime('%Y%m%d_%H%M%S')}.json")
        st = new_state(months)
    elif resume and not st["tested"] and st.get("test_shown"):
        st["tested"] = True        # sinov javoblarini ko'rib, davom ettirildi

    # Hisoblaydi guruhdami? (oddiy a'zo katta guruhda buni so'ray olmaydi — unda tekshirmasdan davom)
    try:
        mem = await client.get_chat_member(GROUP_ID, TARGET_BOT)
        status = str(getattr(mem, "status", "")).lower()
        if "left" in status or "banned" in status:
            await report(client, f"⛔️ @{TARGET_BOT} guruhda yo'q ({status}). Uni guruhga qaytaring va qayta urinib ko'ring.")
            return
    except Exception as e:
        if "USER_NOT_PARTICIPANT" in repr(e).upper() or "UserNotParticipant" in repr(e):
            await report(client, f"⛔️ @{TARGET_BOT} guruhda yo'q. Uni guruhga qaytaring va qayta urinib ko'ring.")
            return
        log(f"   (@{TARGET_BOT} guruhdaligini tekshirib bo'lmadi: {e.__class__.__name__} — davom etamiz)")

    await report(client, f"📦 Hisoblaydi bazasi: **{len(base)}** ta a'zo.")
    if not st["scan_done"]:
        await report(client, f"📜 Guruhning oxirgi {st['months']} oylik tarixi o'qilmoqda — bu bir necha o'n daqiqa olishi mumkin...")
        if not await scan_history(client, st):
            await report(client, f"⏸ Tarix o'qish to'xtatildi ({st['seen']} ta xabar). /sizni_davom bilan davom etadi.")
            return
        await report(client, f"✅ Tarix o'qildi: **{st['seen']}** ta xabar, **{len(st['writers'])}** ta yozgan a'zo.")

    if st.get("queue") is None:
        skip_base, skip_admin = await build_queue(client, st, base)
        n = len(st["queue"])
        await report(client, f"🧮 Yozganlar: {len(st['writers'])} ta\n"
                             f"• hisoblaydi bazasida bor: {skip_base} ta — tekshirilmaydi\n"
                             f"• adminlar: {skip_admin} ta — tekshirilmaydi\n"
                             f"• **tekshiriladi: {n} ta** (taxminan {n * 13 // 3600} soat {n * 13 % 3600 // 60} daqiqa)")

    # Guruhga yozishdan OLDIN: bu akkaunt admin va xabar o'chira oladimi?
    # Oddiy a'zo bo'lsa — Nazorat uning /sizni xabarlarini o'chirib, yozishini yopadi,
    # hisoblaydi javoblari esa guruhda o'chirilmay qolib ketadi.
    ok_admin, why = await am_i_admin(client)
    if not ok_admin:
        save_state(st)
        await report(client, "⛔️ **Tekshiruv boshlanmadi:** " + why + "\n\n"
                             "Guruh sozlamalarida shu akkauntni **admin** qiling (faqat «Xabarlarni o'chirish» huquqi yetarli), "
                             "keyin «Davom» ni bosing. Tarix o'qilgani saqlangan — qaytadan o'qilmaydi.")
        return

    res = await check_all(client, st, base)
    out = save_outputs(base, st)
    if res != "done":
        if res == "stopped":
            await report(client, f"⏸ To'xtatildi. Hozirgacha bazaga qo'shilgan: {len(out) - len(base)} ta. Davomi: /sizni_davom")
        return

    stats = {}
    for r in st["results"].values():
        stats[r["status"]] = stats.get(r["status"], 0) + 1
    await report(client,
        f"🏁 **TEKSHIRUV TUGADI**\n\n"
        f"✅ Odam qo'shgan (bazaga qo'shildi): **{stats.get('ok', 0)}** ta\n"
        f"➖ Qo'shmagan: {stats.get('zero', 0)} ta\n"
        f"⏳ Javobsiz: {stats.get('noanswer', 0)} ta · 🗑 xabari qolmagan: {stats.get('nomsg', 0)} ta · ❓ tushunarsiz: {stats.get('unknown', 0)} ta\n\n"
        f"📈 Boyitilgan baza: **{len(out)}** ta (avval {len(base)} ta)\n\n"
        f"👉 Faylni serverdagi bot papkasining **messages/** ichiga `hisoblaydi_baza.json` nomi bilan yuklang — "
        f"Nazorat bot uni o'zi o'qiydi (bazadagi sonlar kamaymaydi, faqat oshadi).")
    await send_files(client)


async def send_files(client):
    for path, cap in ((OUT_FILE, "Boyitilgan baza"), (REPORT_FILE, "Kim qancha qo'shgani")):
        if os.path.exists(path):
            try:
                await client.send_document(REPORT_TO, path, caption=cap)
            except Exception as e:
                log(f"   faylni yuborib bo'lmadi: {e!r} — u shu papkada: {path}")


async def start(client, resume, months=MONTHS):
    if busy.locked():
        await report(client, "⏳ Tekshiruv allaqachon ketyapti.")
        return
    async with busy:
        STOP["flag"] = False
        try:
            await run(client, resume, months)
        except Exception as e:
            log(f"❌ Kutilmagan xato: {e!r}")
            await report(client, f"❌ Kutilmagan xato: `{e!r}`\nHolat saqlangan — /sizni_davom bilan davom eting.")


def state_summary():
    st = load_state()
    if not st:
        return "Hali boshlanmagan."
    if not st["scan_done"]:
        return f"Tarix o'qilmoqda: {st['seen']} ta xabar, {len(st['writers'])} ta yozgan a'zo."
    q = st.get("queue") or []
    stats = {}
    for r in st["results"].values():
        stats[r["status"]] = stats.get(r["status"], 0) + 1
    return (f"Tekshirildi: {len(st['results'])}/{len(q)} · odam qo'shgan: {stats.get('ok', 0)} · "
            f"qo'shmagan: {stats.get('zero', 0)} · javobsiz: {stats.get('noanswer', 0)} · xabari yo'q: {stats.get('nomsg', 0)}")


ADMIN_FILTER = (filters.me & filters.private) if IN_MEMORY else (filters.user(ADMIN_ID) & filters.private)


@app.on_message(filters.document & ADMIN_FILTER)
async def on_base_file(client, message):
    name = (message.document.file_name or "").lower()
    if not name.endswith(".json"):
        return
    if busy.locked():
        await report(client, "⏳ Tekshiruv ketayotganda bazani almashtirib bo'lmaydi. Avval /sizni_toxtat.")
        return
    tmp = await message.download(file_name=os.path.join(BASE_DIR, "baza_yuklandi.tmp"))
    try:
        if os.path.exists(BASE_FILE):
            os.replace(BASE_FILE, f"hisoblaydi_baza_eski_{time.strftime('%Y%m%d_%H%M%S')}.json")
        os.replace(tmp, BASE_FILE)
        base = load_base()
        await report(client, f"📥 Baza qabul qilindi: **{len(base or {})}** ta a'zo.\nBoshlash: /sizni_boshla")
    except Exception as e:
        await report(client, f"❌ Faylni o'qib bo'lmadi: {e!r}")


@app.on_message(filters.command("sizni_boshla") & ADMIN_FILTER)
async def cmd_start(client, message):
    parts = (message.text or "").split()
    months = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() and 1 <= int(parts[1]) <= 36 else MONTHS
    asyncio.get_event_loop().create_task(start(client, False, months))


@app.on_message(filters.command("sizni_davom") & ADMIN_FILTER)
async def cmd_resume(client, message):
    asyncio.get_event_loop().create_task(start(client, True))


@app.on_message(filters.command("sizni_toxtat") & ADMIN_FILTER)
async def cmd_stop(client, message):
    STOP["flag"] = True
    await report(client, "⏹ To'xtatilmoqda... (joriy tekshiruv tugagach)")


@app.on_message(filters.command("sizni_holat") & ADMIN_FILTER)
async def cmd_status(client, message):
    await report(client, "📊 " + state_summary())


@app.on_message(filters.command("sizni_natija") & ADMIN_FILTER)
async def cmd_result(client, message):
    base, st = load_base(), load_state()
    if base is None or not st:
        await report(client, "Hali natija yo'q.")
        return
    out = save_outputs(base, st)
    await report(client, f"📦 Hozirgi holat: {len(out)} ta (qo'shildi: {len(out) - len(base)}).")
    await send_files(client)


if __name__ == "__main__":
    log("Dastur ishga tushdi. Telegramda: bazani yuboring, keyin /sizni_boshla (to'xtatish: Ctrl+C)")
    app.run()
