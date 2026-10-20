import os, time, json, asyncio, base64, hashlib, sys, traceback
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as _Response, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import aiomysql
import httpx
from telethon import TelegramClient, events, Button
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError,
    FloodWaitError, ChatWriteForbiddenError, ChatRestrictedError, UserBannedInChannelError
)

load_dotenv()

app = FastAPI(title="TopUpBuzz API")

@app.get("/health")
async def health_check():
    return {"ok": True, "status": "healthy"}

app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])


API_ID = int(os.getenv("API_ID", "0"))
API_HASH = os.getenv("API_HASH", "")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
MAIN_ADMIN_ID = int(os.getenv("MAIN_ADMIN_ID", "0"))
USER_API_ID = int(os.getenv("USER_API_ID", "0"))
USER_API_HASH = os.getenv("USER_API_HASH", "")
API_KEY = os.getenv("API_KEY", "")
PANEL_URL = os.getenv("PANEL_URL", "https://bot.jahid.one")
BD_TZ = timezone(timedelta(hours=6))
BOT_USERNAME = "S4JahidBot"
SHORT_NAME = "panel"

DB_CFG = dict(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", ""),
    password=os.getenv("DB_PASS", ""),
    db=os.getenv("DB_NAME", ""),
)

pool = None
clients = {}

try:
    from cryptography.fernet import Fernet
    HAS_FERNET = True
except ImportError:
    HAS_FERNET = False

def _fernet():
    if not HAS_FERNET: return None
    seed = (os.getenv("JWT_SECRET") or "topupbuzz-seed").encode()
    key = base64.urlsafe_b64encode(hashlib.sha256(seed).digest())
    return Fernet(key)

def enc_session(s):
    if not s: return s
    f = _fernet()
    if not f: return s
    try: return f.encrypt(s.encode()).decode()
    except: return s

def dec_session(s):
    if not s: return s
    f = _fernet()
    if not f: return s
    try: return f.decrypt(s.encode()).decode()
    except: return s

async def init_pool():
    global pool
    pool = await aiomysql.create_pool(
        **DB_CFG, autocommit=True, minsize=2, maxsize=10,
        charset="utf8mb4", use_unicode=True
    )

async def db_fetch(q, args=()):
    async with pool.acquire() as c:
        async with c.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(q, args)
            return await cur.fetchall()

async def db_exec(q, args=()):
    async with pool.acquire() as c:
        async with c.cursor() as cur:
            await cur.execute(q, args)
            return cur.lastrowid

async def init_tables():
    tables = [
        "CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, username VARCHAR(64), first_name VARCHAR(64) NULL, photo_url VARCHAR(512) NULL, plan VARCHAR(16) DEFAULT 'unverified', plan_expiry BIGINT NULL, banned TINYINT DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(32) PRIMARY KEY, user_id BIGINT, phone VARCHAR(20), session TEXT, health VARCHAR(32) DEFAULT 'Safe', settings_json JSON NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS campaigns (acc_id VARCHAR(32) PRIMARY KEY, source VARCHAR(255) NULL, source_title VARCHAR(255) NULL, filters_json JSON NULL, groups_json JSON NULL, blacklist_json JSON NULL, interval_min INT DEFAULT 5, status VARCHAR(16) DEFAULT 'Stopped', last_run BIGINT DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, acc_id VARCHAR(32), group_title VARCHAR(255), status VARCHAR(64), ts DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS plans (name VARCHAR(32) PRIMARY KEY, price INT DEFAULT 0, days INT DEFAULT 30, max_accounts INT DEFAULT 0, max_daily_joins INT DEFAULT 0, max_daily_messages INT DEFAULT 0, label VARCHAR(64) DEFAULT '')",
        "CREATE TABLE IF NOT EXISTS notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT, type VARCHAR(32), title VARCHAR(255), body TEXT, seen TINYINT DEFAULT 0, ts DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX(user_id, seen, id))",
        "CREATE TABLE IF NOT EXISTS webhooks (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT, url VARCHAR(512), events VARCHAR(255) DEFAULT 'campaign_fail', active TINYINT DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX(user_id, active))",
        "CREATE TABLE IF NOT EXISTS system_meta (k VARCHAR(64) PRIMARY KEY, v TEXT)",
    ]
    for q in tables:
        try: await db_exec(q)
        except Exception as e: print("table err:", str(e)[:100], flush=True)

async def ensure_columns():
    cols = [
        "ALTER TABLE users ADD COLUMN first_name VARCHAR(64) NULL",
        "ALTER TABLE users ADD COLUMN photo_url VARCHAR(512) NULL",
        "ALTER TABLE campaigns ADD COLUMN mode VARCHAR(16) DEFAULT 'copy'",
        "ALTER TABLE campaigns ADD COLUMN active_hours_start INT DEFAULT 0",
        "ALTER TABLE campaigns ADD COLUMN active_hours_end INT DEFAULT 23",
        "ALTER TABLE campaigns ADD COLUMN source_type VARCHAR(32) DEFAULT 'channel'",
        "ALTER TABLE campaigns ADD COLUMN multi_links JSON NULL",
        "ALTER TABLE campaigns ADD COLUMN paused TINYINT DEFAULT 0",
        "ALTER TABLE campaigns ADD COLUMN paused_reason VARCHAR(128) DEFAULT NULL",
        "ALTER TABLE campaigns ADD COLUMN scheduled_at BIGINT DEFAULT 0",
        "ALTER TABLE accounts ADD COLUMN last_active DATETIME NULL",
        "ALTER TABLE accounts ADD COLUMN flood_count INT DEFAULT 0",
        "ALTER TABLE accounts ADD COLUMN ban_risk VARCHAR(16) DEFAULT 'low'",
    ]
    for q in cols:
        try: await db_exec(q)
        except: pass

def auth(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(401, "unauthorized")
    return True

def _require_admin(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id or int(x_telegram_id) != MAIN_ADMIN_ID:
        raise HTTPException(403, "admin_only")
    return True

async def get_client(acc_id, session):
    c = clients.get(acc_id)
    if c and c.is_connected():
        return c
    c = TelegramClient(StringSession(dec_session(session)), API_ID, API_HASH)
    await c.connect()
    clients[acc_id] = c
    return c

bot_client = TelegramClient("bot_session", API_ID, API_HASH)

async def notify_user(user_id, ntype, title, body=""):
    try:
        await db_exec("INSERT INTO notifications(user_id,type,title,body) VALUES(%s,%s,%s,%s)", (user_id, ntype, title[:255], body))
    except: pass
    try:
        await bot_client.send_message(int(user_id), "Notification: " + title + "\n\n" + body)
    except: pass

async def fire_webhook(user_id, event, data):
    try:
        rows = await db_fetch("SELECT url FROM webhooks WHERE user_id=%s AND active=1 AND FIND_IN_SET(%s, events)", (user_id, event))
        for r in rows:
            try:
                async with httpx.AsyncClient(timeout=10) as c:
                    await c.post(r["url"], json={"event": event, "data": data, "ts": int(time.time())})
            except: pass
    except: pass

async def blast(acc_id, session, source, groups, ghost=True, concurrency=5):
    client = await get_client(acc_id, session)
    source_entity = None
    tried = []
    candidates = [source]
    s = str(source)
    if s.lstrip("-").isdigit():
        n = int(s.lstrip("-"))
        candidates.extend([-n, -1000000000000 - n, n])
    
    for cand in candidates:
        try:
            source_entity = await client.get_entity(cand)
            print("source resolved: " + str(source) + " -> " + str(source_entity), flush=True)
            break
        except ValueError:
            # যদি ইউজারনেম বা লিংক ভুল হয়
            tried.append(f"{cand}: Invalid username or link")
        except Exception as e:
            tried.append(f"{cand}: {str(e)[:40]}")
            
    if source_entity is None:
        return {
            "ok": False, 
            "error": "source_not_found", 
            "message": "Source channel not found. Please use a valid @username or https://t.me/+invite_link"
        }
    try:
        msg = None
        src_str = str(source).strip()
        # Multiple Links Logic (Type 3)
        if "\n" in src_str:
            links = [l.strip() for l in src_str.split("\n") if l.strip()]
            chosen_link = random.choice(links) if links else src_str
            parts = chosen_link.replace("https://t.me/", "").split("/")
            if len(parts) >= 2:
                channel, msg_id = parts[0], int(parts[1])
                msgs = await client.get_messages(channel, ids=msg_id)
                if msgs: msg = msgs
            if not msg:
                return {"ok": False, "error": "multi_link_invalid"}
        
        # Single Link Logic (Type 2)
        elif src_str.startswith("https://t.me/") and "/" in src_str[13:]:
            parts = src_str.replace("https://t.me/", "").split("/")
            if len(parts) >= 2:
                channel, msg_id = parts[0], int(parts[1])
                msgs = await client.get_messages(channel, ids=msg_id)
                if msgs: msg = msgs
            if not msg:
                return {"ok": False, "error": "single_link_invalid"}
        else:
            # Channel Latest Post (Type 1)
            msgs = await client.get_messages(source_entity, limit=1)
            if msgs: msg = msgs[0]
            
        if not msg:
            return {"ok": False, "error": "no_source_msg"}
    except Exception as e:
        return {"ok": False, "error": "fetch_fail: " + str(e)[:100]}
    sem = asyncio.Semaphore(concurrency) if concurrency > 0 else None
    result = {"success": 0, "failed": 0, "errors": [], "flood": 0}

    async def send_one(g):
        gid = g.get("id") if isinstance(g, dict) else g
        title = g.get("title", "?") if isinstance(g, dict) else str(g)
        ok = False
        err = None
        try:
            if ghost:
                await client.send_message(gid, msg)
            else:
                await client.forward_messages(gid, msg)
            ok = True
        except FloodWaitError as fwe:
            err = "flood_" + str(fwe.seconds) + "s"
            result["flood"] += 1
        except Exception as e:
            err = str(e)[:120]
        status = "success" if ok else "fail:" + str(err)
        try:
            await db_exec("INSERT INTO logs(acc_id,group_title,status) VALUES(%s,%s,%s)", (acc_id, (title or "?")[:250], status[:60]))
        except Exception as e:
            print("log insert fail: " + str(e)[:100], flush=True)
        if ok:
            result["success"] += 1
        else:
            result["failed"] += 1
            result["errors"].append(title + ": " + str(err))

    async def wrap(g):
        if sem:
            async with sem: await send_one(g)
        else:
            await send_one(g)

    await asyncio.gather(*[wrap(g) for g in groups], return_exceptions=True)

    if result["flood"] >= 3:
        try:
            owner = await db_fetch("SELECT user_id FROM accounts WHERE id=%s", (acc_id,))
            if owner and owner[0]["user_id"]:
                await notify_user(int(owner[0]["user_id"]), "flood_alert", "Account at Risk", "Account " + acc_id + " hit FloodWait " + str(result["flood"]) + " times. Increase interval.")
                await fire_webhook(int(owner[0]["user_id"]), "flood_alert", {"acc_id": acc_id, "count": result["flood"]})
        except: pass
    return {"ok": True, "total": len(groups), **result}

async def campaign_worker():
    while True:
        try:
            camps = await db_fetch("SELECT * FROM campaigns WHERE status='Running' AND (paused IS NULL OR paused=0)")
            now = time.time()
            for c in camps:
                try:
                    if c.get("scheduled_at") and c["scheduled_at"] > now:
                        continue
                    # Active Hours Check (Sleep Mode)
                    now_bd = datetime.now(BD_TZ)
                    curr_hour = now_bd.hour
                    start_h = c.get("active_hours_start") or 0
                    end_h = c.get("active_hours_end") or 23
                    
                    is_active_time = False
                    if start_h <= end_h:
                        is_active_time = start_h <= curr_hour <= end_h
                    else: # e.g. 22 to 6 (overnight)
                        is_active_time = curr_hour >= start_h or curr_hour <= end_h

                    if not is_active_time:
                        continue # Sleep time-e post korbe na

                    # Active Hours Check (Sleep Mode)
                    now_bd = datetime.now(BD_TZ)
                    curr_hour = now_bd.hour
                    start_h = c.get("active_hours_start") or 0
                    end_h = c.get("active_hours_end") or 23
                    
                    is_active_time = False
                    if start_h <= end_h:
                        is_active_time = start_h <= curr_hour <= end_h
                    else: # e.g. 22 to 6 (overnight)
                        is_active_time = curr_hour >= start_h or curr_hour <= end_h

                    if not is_active_time:
                        continue # Sleep time-e post korbe na

                    interval = (c.get("interval_min") or 5) * 60
                    if now - (c.get("last_run") or 0) < interval:
                        continue
                    groups = c["groups_json"]
                    if isinstance(groups, str):
                        try: groups = json.loads(groups)
                        except: groups = []
                    if not groups: continue
                    acc = await db_fetch("SELECT session, settings_json FROM accounts WHERE id=%s", (c["acc_id"],))
                    if not acc: continue
                    session = acc[0]["session"]
                    mode = c.get("mode") or "copy"
                    ghost = (mode == "copy")
                    result = await blast(c["acc_id"], session, c["source"], groups, ghost=ghost, concurrency=5)
                    if not result.get("ok"):
                        err = result.get("error", "unknown")
                        print("blast fail " + c["acc_id"] + ": " + err, flush=True)
                        if "source_unresolvable" in err or "source_not" in err:
                            await db_exec("UPDATE campaigns SET status='Error' WHERE acc_id=%s", (c["acc_id"],))
                        else:
                            await db_exec("UPDATE campaigns SET last_run=%s WHERE acc_id=%s", (int(now), c["acc_id"]))
                    else:
                        print("BLAST " + c["acc_id"] + ": " + str(result), flush=True)
                        await db_exec("UPDATE campaigns SET last_run=%s WHERE acc_id=%s", (int(now), c["acc_id"]))
                except Exception as e:
                    print("campaign err " + str(c.get("acc_id", "?")) + ": " + str(e)[:100], flush=True)
        except Exception as e:
            print("worker err: " + str(e)[:200], flush=True)
        await asyncio.sleep(10)

async def db_backup_worker():
    await asyncio.sleep(120)
    while True:
        try:
            now = datetime.now(BD_TZ)
            today = now.strftime("%Y-%m-%d")
            slot = "AM" if now.hour < 12 else "PM"
            key = "last_backup_" + slot
            last = await db_fetch("SELECT v FROM system_meta WHERE k=%s", (key,))
            if not last or last[0]["v"] != today:
                path = "/tmp/backup_" + today + "_" + slot + ".sql"
                cmd = "mysqldump -u" + DB_CFG["user"] + " -p" + DB_CFG["password"] + " " + DB_CFG["db"] + " > " + path + " 2>/dev/null"
                rc = os.system(cmd)
                if rc == 0 and os.path.exists(path):
                    size = os.path.getsize(path)
                    if size > 100:
                        try:
                            cap = "DB backup " + today + " " + slot + " | " + str(size // 1024) + " KB"
                            await bot_client.send_file(MAIN_ADMIN_ID, path, caption=cap)
                            print("backup sent: " + today + " " + slot, flush=True)
                        except Exception as e:
                            print("backup send fail: " + str(e)[:100], flush=True)
                        await db_exec("INSERT INTO system_meta(k,v) VALUES(%s,%s) ON DUPLICATE KEY UPDATE v=%s", (key, today, today))
                    try: os.remove(path)
                    except: pass
        except Exception as e:
            print("backup err: " + str(e)[:100], flush=True)
        await asyncio.sleep(1800)

async def start_bot():
    try:
        await bot_client.start(bot_token=BOT_TOKEN)
        me = await bot_client.get_me()
        print("bot OK: @" + me.username + " (" + str(me.id) + ")", flush=True)
    except Exception as e:
        print("bot start failed: " + str(e)[:200], flush=True)

@bot_client.on(events.NewMessage(pattern=r"^/start"))
async def cmd_start(event):
    try:
        url = "https://code-space-ten.vercel.app/dashboard"
        buttons = [[Button.web_view("Open Panel", url)]]
        msg_text = "**TopUpBuzz Control Panel**" + chr(10) + chr(10) + "Manage your Telegram automation from a single dashboard."
        nl = chr(10)
        await event.reply(msg_text, buttons=buttons)
    except Exception as e:
        print("Start command error:", e)


async def cmd_start(event):
    try:
        url = "https://code-space-ten.vercel.app/dashboard"
        buttons = [[Button.web_view("Open Panel", url)]]
        msg_text = "**TopUpBuzz Control Panel**" + chr(10) + chr(10) + "Manage your Telegram automation from a single dashboard."

        await event.reply(msg_text, buttons=buttons)
    except Exception as e:
        print("Start command error:", e)


@bot_client.on(events.NewMessage(pattern=r"^/start"))
async def cmd_start(event):
    try:
        url = "https://code-space-ten.vercel.app/dashboard"
        buttons = [[Button.web_view("Open Panel", url)]]
        msg_text = "**TopUpBuzz Control Panel**" + chr(10) + chr(10) + "Manage your Telegram automation from a single dashboard."
        nl = chr(10)
        await event.reply(msg_text, buttons=buttons)
    except Exception as e:
        print("Start command error:", e)


async def cmd_start(event):
    try:
        url = "https://code-space-ten.vercel.app/dashboard"
        buttons = [[Button.web_view("Open Panel", url)]]
        msg_text = "**TopUpBuzz Control Panel**" + chr(10) + chr(10) + "Manage your Telegram automation from a single dashboard."

        await event.reply(msg_text, buttons=buttons)
    except Exception as e:
        print("Start command error:", e)


async def cmd_start(event):
    try:
        url = "https://code-space-ten.vercel.app/dashboard"
        buttons = [[Button.web_view("Open Panel", url)]]
        msg_text = "**TopUpBuzz Control Panel**" + chr(10) + chr(10) + "Manage your Telegram automation from a single dashboard."
        await event.reply(msg_text, buttons=buttons)
    except Exception as e:
        print("Start command error:", e)
    c = clients.pop(acc_id, None)
    if c:
        try: await c.disconnect()
        except: pass
    return {"ok": True}

@app.get("/accounts/{acc_id}/session", dependencies=[Depends(auth)])
async def get_session(acc_id: str):
    rows = await db_fetch("SELECT session, phone FROM accounts WHERE id=%s", (acc_id,))
    if not rows: raise HTTPException(404, "not_found")
    return {"session": rows[0]["session"], "phone": rows[0]["phone"]}

@app.post("/accounts/{acc_id}/dialogs/refresh", dependencies=[Depends(auth)])
async def refresh_dialogs(acc_id: str):
    rows = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not rows: raise HTTPException(404, "not_found")
    c = await get_client(acc_id, rows[0]["session"])
    groups, channels = [], []
    try:
        async for d in c.iter_dialogs():
            item = {"id": d.id, "title": d.title, "username": getattr(d.entity, "username", None)}
            if d.is_group: groups.append(item)
            elif d.is_channel and not d.is_group: channels.append(item)
    except Exception as e:
        raise HTTPException(500, "telegram_error: " + str(e)[:150])
    return {"groups": groups, "channels": channels, "total": len(groups) + len(channels)}

@app.get("/accounts/{acc_id}/campaign", dependencies=[Depends(auth)])
async def get_camp(acc_id: str):
    rows = await db_fetch("SELECT * FROM campaigns WHERE acc_id=%s", (acc_id,))
    if not rows: return {"acc_id": acc_id, "status": "Stopped", "groups_json": [], "mode": "copy"}
    r = rows[0]
    for k in ["filters_json", "groups_json", "blacklist_json"]:
        if isinstance(r.get(k), str):
            try: r[k] = json.loads(r[k])
            except: pass
    return r

@app.post("/accounts/{acc_id}/campaign", dependencies=[Depends(auth)])
async def save_camp(acc_id: str, payload: dict):
    groups = payload.get("groups", [])
    filters = payload.get("filters", [])
    blacklist = payload.get("blacklist", [])
    interval = payload.get("interval_min", 5)
    source = payload.get("source")
    source_title = payload.get("source_title", "")
    mode = payload.get("mode", "copy")

    if source:
        rows = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
        if rows:
            c = await get_client(acc_id, rows[0]["session"])
            try:
                first_src = source.strip().split("\n")[0]
                entity = await c.get_entity(first_src)
                if not source_title:
                    source_title = getattr(entity, "title", None) or str(first_src)
            except Exception as e:
                raise HTTPException(400, "source_not_resolvable: " + str(e)[:120])

    if filters:
        groups = [g for g in groups if any(f.lower() in g["title"].lower() for f in filters)]
    if blacklist:
        groups = [g for g in groups if g["id"] not in blacklist]

    await db_exec("INSERT INTO campaigns(acc_id,source,source_title,filters_json,groups_json,blacklist_json,interval_min,mode) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE source=VALUES(source),source_title=VALUES(source_title),filters_json=VALUES(filters_json),groups_json=VALUES(groups_json),blacklist_json=VALUES(blacklist_json),interval_min=VALUES(interval_min),mode=VALUES(mode)",
        (acc_id, source, source_title, json.dumps(filters), json.dumps(groups), json.dumps(blacklist), interval, mode))
    return {"ok": True, "group_count": len(groups)}

@app.post("/accounts/{acc_id}/campaign/start", dependencies=[Depends(auth)])
async def camp_start(acc_id: str):
    await db_exec("INSERT INTO campaigns(acc_id,status,last_run) VALUES(%s,'Running',0) ON DUPLICATE KEY UPDATE status='Running',last_run=0,paused=0", (acc_id,))
    rows = await db_fetch("SELECT source, groups_json FROM campaigns WHERE acc_id=%s", (acc_id,))
    if not rows: raise HTTPException(500, "no_campaign")
    r = rows[0]
    grps = r["groups_json"]
    if isinstance(grps, str):
        try: grps = json.loads(grps)
        except: grps = []
    if not r["source"]: raise HTTPException(400, "source_not_set")
    if not grps: raise HTTPException(400, "no_groups")
    return {"ok": True, "source": r["source"], "group_count": len(grps)}

@app.post("/accounts/{acc_id}/campaign/stop", dependencies=[Depends(auth)])
async def camp_stop(acc_id: str):
    await db_exec("UPDATE campaigns SET status='Stopped' WHERE acc_id=%s", (acc_id,))
    return {"ok": True}

@app.post("/accounts/{acc_id}/campaign/pause", dependencies=[Depends(auth)])
async def camp_pause(acc_id: str):
    await db_exec("UPDATE campaigns SET paused=1, paused_reason='manual' WHERE acc_id=%s", (acc_id,))
    return {"ok": True}

@app.post("/accounts/{acc_id}/campaign/resume", dependencies=[Depends(auth)])
async def camp_resume(acc_id: str):
    await db_exec("UPDATE campaigns SET paused=0, paused_reason=NULL, last_run=0 WHERE acc_id=%s", (acc_id,))
    return {"ok": True}

@app.post("/accounts/{acc_id}/campaign/schedule", dependencies=[Depends(auth)])
async def camp_schedule(acc_id: str, payload: dict):
    ts = int(payload.get("scheduled_at", 0))
    if ts <= 0: raise HTTPException(400, "invalid")
    await db_exec("UPDATE campaigns SET scheduled_at=%s, status='Scheduled' WHERE acc_id=%s", (ts, acc_id))
    return {"ok": True, "scheduled_at": ts}

@app.post("/accounts/{acc_id}/campaign/unschedule", dependencies=[Depends(auth)])
async def camp_unsched(acc_id: str):
    await db_exec("UPDATE campaigns SET scheduled_at=0, status='Stopped' WHERE acc_id=%s", (acc_id,))
    return {"ok": True}

@app.post("/accounts/{acc_id}/retry-failed", dependencies=[Depends(auth)])
async def retry_failed(acc_id: str):
    rows = await db_fetch("SELECT DISTINCT group_title FROM logs WHERE acc_id=%s AND status NOT LIKE 'success%%' ORDER BY id DESC LIMIT 100", (acc_id,))
    if not rows: return {"ok": True, "retried": 0, "message": "no failed groups"}
    camp_rows = await db_fetch("SELECT * FROM campaigns WHERE acc_id=%s", (acc_id,))
    if not camp_rows: raise HTTPException(404, "no_campaign")
    camp = camp_rows[0]
    groups = camp["groups_json"]
    if isinstance(groups, str):
        try: groups = json.loads(groups)
        except: groups = []
    failed_titles = set(r["group_title"] for r in rows)
    retry_groups = [g for g in groups if isinstance(g, dict) and g.get("title") in failed_titles]
    if not retry_groups: return {"ok": True, "retried": 0}
    acc_rows = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not acc_rows: raise HTTPException(404, "no_account")
    ghost = (camp.get("mode") or "copy") == "copy"
    result = await blast(acc_id, acc_rows[0]["session"], camp["source"], retry_groups, ghost=ghost, concurrency=5)
    return {"ok": True, "retried": len(retry_groups), **result}

@app.get("/accounts/{acc_id}/logs", dependencies=[Depends(auth)])
async def get_logs(acc_id: str, limit: int = 100):
    return await db_fetch("SELECT * FROM logs WHERE acc_id=%s ORDER BY id DESC LIMIT %s", (acc_id, limit))

@app.get("/accounts/{acc_id}/logs.csv", dependencies=[Depends(auth)])
async def logs_csv(acc_id: str):
    rows = await db_fetch("SELECT ts, group_title, status FROM logs WHERE acc_id=%s ORDER BY id DESC LIMIT 5000", (acc_id,))
    import csv, io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["timestamp", "group_title", "status"])
    for r in rows: w.writerow([r["ts"], r["group_title"], r["status"]])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="logs_' + acc_id + '.csv"'})

@app.post("/accounts/{acc_id}/health-check", dependencies=[Depends(auth)])
async def hc(acc_id: str):
    rows = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not rows: raise HTTPException(404)
    c = await get_client(acc_id, rows[0]["session"])
    try:
        me = await c.get_me()
        await db_exec("UPDATE accounts SET last_active=NOW(), health='Safe' WHERE id=%s", (acc_id,))
        return {"ok": True, "username": me.username}
    except Exception as e:
        err = str(e)[:100]
        new_h = "Restricted" if "restrict" in err.lower() or "banned" in err.lower() else "Error"
        await db_exec("UPDATE accounts SET health=%s WHERE id=%s", (new_h, acc_id))
        return {"ok": False, "error": err, "health": new_h}

# ============ AUTH (OTP login) ============
pending_logins = {}

class SendOtpReq(BaseModel):
    phone: str
    telegram_id: int | None = None

class VerifyOtpReq(BaseModel):
    session_id: str
    code: str
    password: str | None = None

class MiniAuthReq(BaseModel):
    init_data: str

def _verify_init_data(init_data):
    try:
        from urllib.parse import parse_qsl
        params = dict(parse_qsl(init_data, keep_blank_values=True))
        received = params.pop("hash", None)
        if not received: 
            print("No hash found in initData")
            return None
        dcs = "\n".join(k + "=" + str(v) for k, v in sorted(params.items()))
        secret = hmac_new(b"WebAppData", BOT_TOKEN.encode())
        computed = hmac_hex(secret, dcs.encode())
        if computed != received: 
            print("Hash Mismatch! Computed:", computed, "Received:", received)
            return None
        return params
    except Exception as e: 
        print("InitData parse error:", e)
        return None

def hmac_new(key, msg):
    import hmac as _h
    return _h.new(key, msg, hashlib.sha256).digest()

def hmac_hex(key, msg):
    import hmac as _h
    return _h.new(key, msg, hashlib.sha256).hexdigest()

@app.post("/auth/send-otp")
async def send_otp(req: SendOtpReq):
    phone = req.phone.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("+"): raise HTTPException(400, "phone_must_start_with_plus")
    now = time.time()
    for sid in list(pending_logins.keys()):
        if now - pending_logins[sid]["created"] > 600:
            try: await pending_logins[sid]["client"].disconnect()
            except: pass
            del pending_logins[sid]
    c = TelegramClient(StringSession(), USER_API_ID, USER_API_HASH)
    await c.connect()
    try:
        code_req = await c.send_code_request(phone)
    except Exception as e:
        try: await c.disconnect()
        except: pass
        raise HTTPException(400, "telegram_error: " + str(e)[:150])
    import secrets as _s
    sid = _s.token_urlsafe(24)
    pending_logins[sid] = {"client": c, "phone": phone, "hash": code_req.phone_code_hash, "created": now, "telegram_id": req.telegram_id}
    return {"ok": True, "session_id": sid, "phone": phone}

@app.post("/auth/verify-otp")
async def verify_otp(req: VerifyOtpReq):
    data = pending_logins.get(req.session_id)
    if not data: raise HTTPException(404, "session_not_found")
    if time.time() - data["created"] > 600:
        try: await data["client"].disconnect()
        except: pass
        del pending_logins[req.session_id]
        raise HTTPException(400, "session_expired")
    c = data["client"]
    code = req.code.strip().replace(" ", "")
    
    if not c.is_connected():
        await c.connect()
        
    try:
        await c.sign_in(phone=data["phone"], code=code, phone_code_hash=data["hash"])
    except SessionPasswordNeededError:
        if not req.password:
            return {"ok": False, "needs_password": True}
            
        if not c.is_connected():
            await c.connect()
            
        try:
            await c.sign_in(password=req.password)
        except Exception as e:
            raise HTTPException(400, "2fa_error: " + str(e)[:120])
    except PhoneCodeInvalidError: raise HTTPException(400, "invalid_code")
    except PhoneCodeExpiredError: raise HTTPException(400, "code_expired")
    except Exception as e: raise HTTPException(400, "signin_error: " + str(e)[:150])
    
    me = await c.get_me()
    session_str = c.session.save()
    try: await c.disconnect()
    except: pass
    import secrets as _s
    acc_id = "acc_" + str(int(time.time())) + "_" + _s.token_hex(2)
    owner_id = data.get("telegram_id") or 0
    encrypted = enc_session(session_str)
    await db_exec("INSERT INTO accounts(id,user_id,phone,session,settings_json) VALUES(%s,%s,%s,%s,%s)",
        (acc_id, owner_id, data["phone"], encrypted, json.dumps({"ghost_forward": True})))
    del pending_logins[req.session_id]
    return {"ok": True, "acc_id": acc_id, "phone": data["phone"], "user_id": me.id, "username": me.username}

@app.post("/auth/telegram-mini")
async def telegram_mini(req: MiniAuthReq):
    params = _verify_init_data(req.init_data)
    if not params: 
        print("❌ InitData Verification Failed!")
        raise HTTPException(401, "invalid_init_data")
    
    user_json = params.get("user")
    if not user_json: 
        raise HTTPException(400, "no_user_in_initdata")
    
    u = json.loads(user_json)
    user_id = u["id"]
    
    # ইউজার ডাটাবেসে আছে কিনা চেক
    rows = await db_fetch("SELECT id FROM users WHERE id=%s", (user_id,))
    if not rows:
        await db_exec("INSERT INTO users(id,username,first_name,photo_url,plan) VALUES(%s,%s,%s,%s,'unverified')",
            (user_id, u.get("username") or "", u.get("first_name") or "", u.get("photo_url") or ""))
    else:
        await db_exec("UPDATE users SET username=%s, first_name=%s, photo_url=%s WHERE id=%s",
            (u.get("username") or "", u.get("first_name") or "", u.get("photo_url") or "", user_id))
            
    full_user = await get_user_with_plan(user_id)
    return {"ok": True, "user": full_user}

@app.get("/stats/me", dependencies=[Depends(auth)])
async def stats_me(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    uid = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    totals = await db_fetch("SELECT COUNT(*) as total, SUM(CASE WHEN l.status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN l.status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed, COUNT(DISTINCT l.acc_id) as accounts_active FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s", (uid,))
    daily = await db_fetch("SELECT DATE(l.ts) as day, SUM(CASE WHEN l.status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN l.status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s AND l.ts >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(l.ts) ORDER BY day ASC", (uid,))
    per_acc = await db_fetch("SELECT l.acc_id, a.phone, COUNT(*) as total, SUM(CASE WHEN l.status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN l.status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s GROUP BY l.acc_id, a.phone ORDER BY total DESC LIMIT 20", (uid,))
    return {"totals": totals[0] if totals else {"total":0,"success":0,"failed":0,"accounts_active":0}, "daily": daily, "per_account": per_acc}

@app.get("/stats/admin", dependencies=[Depends(auth)])
async def stats_admin(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    users_c = await db_fetch("SELECT COUNT(*) as c FROM users")
    acc_c = await db_fetch("SELECT COUNT(*) as c FROM accounts")
    camp_c = await db_fetch("SELECT COUNT(*) as c, SUM(status='Running') as running FROM campaigns")
    totals = await db_fetch("SELECT COUNT(*) as total, SUM(CASE WHEN status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs")
    daily = await db_fetch("SELECT DATE(ts) as day, SUM(CASE WHEN status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs WHERE ts >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(ts) ORDER BY day ASC")
    top_users = await db_fetch("SELECT u.id, u.username, u.first_name, u.plan, COUNT(a.id) as acc_count FROM users u LEFT JOIN accounts a ON a.user_id=u.id GROUP BY u.id ORDER BY acc_count DESC LIMIT 10")
    return {"counters": {"users": users_c[0]["c"] if users_c else 0, "accounts": acc_c[0]["c"] if acc_c else 0, "campaigns": camp_c[0]["c"] if camp_c else 0, "running": camp_c[0]["running"] if camp_c else 0}, "totals": totals[0] if totals else {"total":0,"success":0,"failed":0}, "daily": daily, "top_users": top_users}

@app.get("/accounts/{acc_id}/stats", dependencies=[Depends(auth)])
async def acc_stats(acc_id: str):
    rows = await db_fetch("SELECT COUNT(*) as total, SUM(CASE WHEN status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs WHERE acc_id=%s", (acc_id,))
    daily = await db_fetch("SELECT DATE(ts) as day, SUM(CASE WHEN status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs WHERE acc_id=%s AND ts >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(ts) ORDER BY day ASC", (acc_id,))
    return {"totals": rows[0] if rows else {"total":0,"success":0,"failed":0}, "daily": daily}

@app.get("/health/accounts", dependencies=[Depends(auth)])
async def health_accounts(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    rows = await db_fetch("SELECT a.id, a.phone, a.health, a.last_active, a.flood_count, (SELECT COUNT(*) FROM logs WHERE acc_id=a.id) as total_sent, (SELECT COUNT(*) FROM logs WHERE acc_id=a.id AND status LIKE 'success%%') as success, (SELECT COUNT(*) FROM logs WHERE acc_id=a.id AND ts >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as sent_24h, (SELECT COUNT(*) FROM logs WHERE acc_id=a.id AND status NOT LIKE 'success%%' AND ts >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as fail_24h FROM accounts a WHERE a.user_id=%s ORDER BY a.created_at DESC", (target,))
    return rows

# ============ ANALYTICS ============
@app.get("/analytics/groups", dependencies=[Depends(auth)])
async def a_groups(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    top = await db_fetch("SELECT l.group_title, COUNT(*) as total, SUM(CASE WHEN l.status LIKE 'success%%' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN l.status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s GROUP BY l.group_title ORDER BY total DESC LIMIT 20", (target,))
    worst = await db_fetch("SELECT l.group_title, COUNT(*) as total, SUM(CASE WHEN l.status NOT LIKE 'success%%' THEN 1 ELSE 0 END) as failed FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s GROUP BY l.group_title HAVING failed >= 3 ORDER BY failed DESC LIMIT 10", (target,))
    return {"top": top, "worst": worst}

@app.get("/analytics/hours", dependencies=[Depends(auth)])
async def a_hours(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    rows = await db_fetch("SELECT HOUR(l.ts) as hour, COUNT(*) as total, SUM(CASE WHEN l.status LIKE 'success%%' THEN 1 ELSE 0 END) as success FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s AND l.ts >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY HOUR(l.ts) ORDER BY hour ASC", (target,))
    return {"hours": rows}

@app.get("/analytics/cost", dependencies=[Depends(auth)])
async def a_cost(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    uid = int(x_telegram_id)
    user = await db_fetch("SELECT plan FROM users WHERE id=%s", (uid,))
    plan_row = await db_fetch("SELECT * FROM plans WHERE name=%s", (user[0]["plan"] if user else "unverified",))
    total = await db_fetch("SELECT COUNT(*) as c FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s", (uid,))
    used = total[0]["c"] if total else 0
    plan = plan_row[0] if plan_row else {"price": 0, "days": 30, "max_daily_messages": 0}
    cap = (plan.get("max_daily_messages", 0) or 0) * plan.get("days", 30)
    eff = (used / cap * 100) if cap else 0
    return {"plan": user[0]["plan"] if user else "unverified", "price": plan.get("price", 0), "total_sent": used, "lifetime_cap": cap, "efficiency": round(eff, 1), "cost_per_msg": round(plan.get("price", 0) / used, 4) if used else 0}

# ============ WEBHOOKS ============
@app.get("/webhooks", dependencies=[Depends(auth)])
async def list_hooks(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    return await db_fetch("SELECT id, url, events, active, created_at FROM webhooks WHERE user_id=%s ORDER BY id DESC", (int(x_telegram_id),))

@app.post("/webhooks", dependencies=[Depends(auth)])
async def add_hook(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    url = (payload.get("url") or "").strip()
    if not url.startswith(("http://", "https://")): raise HTTPException(400, "invalid_url")
    await db_exec("INSERT INTO webhooks(user_id,url,events) VALUES(%s,%s,%s)", (int(x_telegram_id), url[:500], payload.get("events", "campaign_fail")[:255]))
    return {"ok": True}

@app.delete("/webhooks/{wid}", dependencies=[Depends(auth)])
async def del_hook(wid: int, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    await db_exec("DELETE FROM webhooks WHERE id=%s AND user_id=%s", (wid, int(x_telegram_id)))
    return {"ok": True}

# ============ NOTIFICATIONS ============
@app.get("/notifications", dependencies=[Depends(auth)])
async def list_notifs(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), limit: int = 50):
    if not x_telegram_id: raise HTTPException(401)
    uid = int(x_telegram_id)
    rows = await db_fetch("SELECT id, type, title, body, seen, ts FROM notifications WHERE user_id=%s ORDER BY id DESC LIMIT %s", (uid, limit))
    unread = await db_fetch("SELECT COUNT(*) as c FROM notifications WHERE user_id=%s AND seen=0", (uid,))
    return {"items": rows, "unread": unread[0]["c"] if unread else 0}

@app.post("/notifications/mark-seen", dependencies=[Depends(auth)])
async def mark_seen(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    await db_exec("UPDATE notifications SET seen=1 WHERE user_id=%s", (int(x_telegram_id),))
    return {"ok": True}

# ============ ADMIN ============
@app.get("/admin/users", dependencies=[Depends(auth)])
async def admin_users(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    return await db_fetch("SELECT id, username, first_name, plan, plan_expiry, banned, created_at FROM users ORDER BY created_at DESC LIMIT 200")

@app.post("/admin/broadcast", dependencies=[Depends(auth)])
async def admin_broadcast(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    text = payload.get("text", "").strip()
    if not text: raise HTTPException(400, "empty_text")
    users = await db_fetch("SELECT id FROM users")
    ok, fail = 0, 0
    for u in users:
        try:
            await bot_client.send_message(int(u["id"]), text)
            ok += 1
            await asyncio.sleep(0.1)
        except: fail += 1
    return {"ok": True, "sent": ok, "failed": fail}

# ============ EXPORT ============
@app.get("/export/csv", dependencies=[Depends(auth)])
async def export_csv(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    uid = int(x_telegram_id)
    rows = await db_fetch("SELECT l.ts, a.phone as account, l.group_title, l.status FROM logs l JOIN accounts a ON a.id=l.acc_id WHERE a.user_id=%s ORDER BY l.id DESC LIMIT 50000", (uid,))
    import csv, io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["timestamp", "account", "group_title", "status"])
    for r in rows: w.writerow([r["ts"], r["account"], r["group_title"], r["status"]])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="all_logs.csv"'})

# ============ BACKUP / RESTORE ============
@app.post("/admin/restore", dependencies=[Depends(auth)])
async def restore_db(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), file: UploadFile = File(...)):
    _require_admin(x_telegram_id)
    content = await file.read()
    path = "/tmp/restore_" + str(int(time.time())) + ".sql"
    with open(path, "wb") as f: f.write(content)
    cmd = "mysql -u" + DB_CFG["user"] + " -p" + DB_CFG["password"] + " " + DB_CFG["db"] + " < " + path + " 2>&1"
    result = os.popen(cmd).read()
    try: os.remove(path)
    except: pass
    return {"ok": True, "output": result[:500]}

@app.get("/admin/backup-now", dependencies=[Depends(auth)])
async def backup_now(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    path = "/tmp/now_" + str(int(time.time())) + ".sql"
    cmd = "mysqldump -u" + DB_CFG["user"] + " -p" + DB_CFG["password"] + " " + DB_CFG["db"] + " > " + path
    rc = os.system(cmd)
    if rc != 0: raise HTTPException(500, "backup_failed")
    with open(path, "rb") as f: content = f.read()
    os.remove(path)
    return _Response(content=content, media_type="application/sql",
        headers={"Content-Disposition": 'attachment; filename="backup_' + str(int(time.time())) + '.sql"'})

# ============ AVATAR ============
@app.get("/avatar/{uid}")
async def get_avatar(uid: int):
    if not BOT_TOKEN: raise HTTPException(500, "no_bot_token")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://api.telegram.org/bot" + BOT_TOKEN + "/getUserProfilePhotos", params={"user_id": uid, "limit": 1})
            data = r.json()
            if not data.get("ok") or not data["result"].get("total_count"): raise HTTPException(404, "no_photo")
            file_id = data["result"]["photos"][0][-1]["file_id"]
            r2 = await client.get("https://api.telegram.org/bot" + BOT_TOKEN + "/getFile", params={"file_id": file_id})
            d2 = r2.json()
            if not d2.get("ok"): raise HTTPException(404, "no_file")
            r3 = await client.get("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + d2["result"]["file_path"])
            return _Response(content=r3.content, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*"})
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, "avatar_err: " + str(e)[:100])

# ============ DEBUG ============
@app.get("/debug/me")
async def debug_me(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = None
    try: uid = int(x_telegram_id) if x_telegram_id else None
    except: pass
    rows = []
    if uid: rows = await db_fetch("SELECT id, username, plan FROM users WHERE id=%s", (uid,))
    return {"header_received": x_telegram_id, "parsed_int": uid, "matches": rows, "admin_id_env": str(MAIN_ADMIN_ID), "admin_match": uid == MAIN_ADMIN_ID if uid else False}



# ============ ADMIN: ASSIGN ACCOUNTS ============
@app.post("/admin/assign-account", dependencies=[Depends(auth)])
async def assign_account(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    acc_id = payload.get("acc_id")
    user_id = payload.get("user_id")
    await db_exec("UPDATE accounts SET assigned_user_id=%s WHERE id=%s", (user_id, acc_id))
    return {"ok": True, "message": f"Account {acc_id} assigned to user {user_id}"}

# ============ USER: MY ASSIGNED ACCOUNTS ============
@app.get("/my-accounts", dependencies=[Depends(auth)])
async def my_accounts(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    if not x_telegram_id: raise HTTPException(401)
    uid = int(x_telegram_id)
    # শুধু অ্যাডমিনের দেওয়া অ্যাকাউন্টগুলো দেখাবে
    rows = await db_fetch("SELECT id, phone, health FROM accounts WHERE assigned_user_id=%s", (uid,))
    return rows

# ============ FOLDERS (Custom Group Categories) ============
@app.get("/folders", dependencies=[Depends(auth)])
async def get_folders(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    caller = int(x_telegram_id or 0)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    rows = await db_fetch("SELECT * FROM folders WHERE user_id=%s ORDER BY id DESC", (target,))
    return rows

@app.post("/folders", dependencies=[Depends(auth)])
async def create_folder(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = int(x_telegram_id)
    name = payload.get("name")
    groups = json.dumps(payload.get("groups", []))
    await db_exec("INSERT INTO folders(user_id, name, groups_json) VALUES(%s,%s,%s)", (uid, name, groups))
    return {"ok": True}

# ============ COINS & REFERRAL ============
@app.get("/referral/link", dependencies=[Depends(auth)])
async def get_referral_link(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = int(x_telegram_id)
    # Telegram-এর স্ট্যান্ডার্ড রেফারেল লিংক ফরম্যাট
    link = f"https://t.me/S4JahidBot/panel?startapp=ref_{uid}"
    return {"link": link}

@app.post("/redeem-coins", dependencies=[Depends(auth)])
async def redeem_coins(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = int(x_telegram_id)
    days = payload.get("days")
    cost = payload.get("cost")
    
    user = await db_fetch("SELECT coins, plan_expiry FROM users WHERE id=%s", (uid,))
    if not user or user[0]["coins"] < cost:
        raise HTTPException(400, "Not enough coins!")
        
    # কয়েন কাটা এবং মেয়াদ বাড়ানো
    current_expiry = user[0]["plan_expiry"] or int(time.time())
    new_expiry = current_expiry + (days * 86400)
    
    await db_exec("UPDATE users SET coins = coins - %s, plan_expiry=%s WHERE id=%s", (cost, new_expiry, uid))
    return {"ok": True, "new_expiry": new_expiry}

# ============ POSTS TEMPLATES ============
@app.get("/posts", dependencies=[Depends(auth)])
async def get_posts(x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    return await db_fetch("SELECT * FROM saved_posts WHERE user_id=%s ORDER BY id DESC", (int(x_telegram_id),))

@app.post("/posts", dependencies=[Depends(auth)])
async def save_post(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = int(x_telegram_id)
    await db_exec("INSERT INTO saved_posts(user_id, title, content) VALUES(%s,%s,%s)",
                  (uid, payload.get("title", "Untitled"), payload.get("content")))
    return {"ok": True}



# ============ BROADCAST NOW ============

async def run_broadcast_bg(acc_id, targets, content_type, content, settings):
    import asyncio, datetime
    max_retries = settings.get("max_retries", 3)
    batch_size = settings.get("batch_size", 1)
    delay_minutes = settings.get("delay_minutes", 10)
    forward_mode = settings.get("forward_mode", "copy")
    
    acc = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not acc: return
    client = await get_client(acc_id, acc[0]["session"])
    
    msg = None
    if content_type == "link":
        try:
            parts = content.replace("https://t.me/", "").split("/")
            if len(parts) >= 2:
                channel, msg_id = parts[0], int(parts[1])
                msgs = await client.get_messages(channel, ids=msg_id)
                if msgs: msg = msgs
        except: pass
            
    for i in range(0, len(targets), batch_size):
        batch = targets[i:i+batch_size]
        for gid in batch:
            for attempt in range(max_retries):
                try:
                    if content_type == "text":
                        await client.send_message(gid, content)
                    else:
                        if msg: 
                            if forward_mode == "copy": await client.send_message(gid, msg)
                            else: await client.forward_messages(gid, msg)
                        else: raise Exception("No message")
                    break
                except:
                    if attempt == max_retries - 1: pass
                    else: await asyncio.sleep(2)
        if i + batch_size < len(targets):
            await asyncio.sleep(delay_minutes * 60 if delay_minutes > 0 else 0.5)

@app.post("/broadcast-now", dependencies=[Depends(auth)])
async def broadcast_now(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    acc_id = payload.get("acc_id")
    targets = payload.get("targets", [])
    content_type = payload.get("type", "text")
    content = payload.get("content")
    if not acc_id or not targets or not content:
        raise HTTPException(400, "Missing fields")
    
    caller = int(x_telegram_id) if x_telegram_id else 0
    target_uid = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    
    u_row = await db_fetch("SELECT settings_json FROM users WHERE id=%s", (target_uid,))
    settings = {}
    if u_row and u_row[0]["settings_json"]:
        try: settings = json.loads(u_row[0]["settings_json"])
        except: pass
        
    import datetime
    now = (datetime.datetime.utcnow() + datetime.timedelta(hours=6)).strftime("%H:%M")
    active_start = settings.get("active_start", "00:00")
    active_end = settings.get("active_end", "23:59")
    if active_start != "00:00" and active_end != "23:59":
        if active_start < active_end: is_active = active_start <= now <= active_end
        else: is_active = now >= active_start or now <= active_end
        if not is_active: raise HTTPException(400, "Outside active hours.")

    # ব্যাকগ্রাউন্ডে টাস্ক শুরু করা
    import asyncio
    asyncio.create_task(run_broadcast_bg(acc_id, targets, content_type, content, settings))
    
    return {"ok": True, "message": "Broadcast started in background"}


@app.post("/groups/join-missing", dependencies=[Depends(auth)])
async def join_missing_groups(payload: dict):
    acc_id = payload.get("acc_id")
    groups = payload.get("groups", [])
    acc = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not acc: raise HTTPException(404, "Account not found")
    
    # Background task start
    asyncio.create_task(join_worker(acc_id, acc[0]["session"], groups))
    return {"ok": True, "message": "Joining started in background"}

# ============ FOLDERS EXPORT / IMPORT ============
@app.get("/folders/{folder_id}/export", dependencies=[Depends(auth)])
async def export_folder(folder_id: int):
    rows = await db_fetch("SELECT name, groups_json FROM folders WHERE id=%s", (folder_id,))
    if not rows: raise HTTPException(404)
    groups = rows[0]["groups_json"]
    data = {"name": rows[0]["name"], "groups": json.loads(groups) if isinstance(groups, str) else groups}
    return _Response(content=json.dumps(data, indent=2), media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="folder_{folder_id}.json"'})

# ============ SPAMBOT HEALTH CHECK ============
@app.post("/accounts/{acc_id}/check-spambot", dependencies=[Depends(auth)])
async def check_spambot(acc_id: str):
    rows = await db_fetch("SELECT session FROM accounts WHERE id=%s", (acc_id,))
    if not rows: raise HTTPException(404, "Account not found")
    
    client = await get_client(acc_id, rows[0]["session"])
    try:
        await client.send_message('SpamBot', '/start')
        await asyncio.sleep(3) # Wait for reply
        msgs = await client.get_messages('SpamBot', limit=1)
        reply = msgs[0].text if msgs else "No reply from SpamBot"
        
        status = "Safe"
        if "restricted" in reply.lower() or "limited" in reply.lower():
            status = "Restricted"
            
        await db_exec("UPDATE accounts SET health=%s, last_active=NOW() WHERE id=%s", (status, acc_id))
        return {"ok": True, "status": status, "message": reply}
    except Exception as e:
        raise HTTPException(500, f"SpamBot error: {str(e)[:100]}")


# ============ SAVED POSTS ============
@app.get("/saved-posts", dependencies=[Depends(auth)])
async def get_saved_posts(x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    return await db_fetch("SELECT id, title, content, type, created_at FROM saved_posts WHERE user_id=%s ORDER BY id DESC", (target,))

@app.post("/saved-posts", dependencies=[Depends(auth)])
async def save_post(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    
    title = payload.get("title", "Untitled")
    content = payload.get("content", "")
    p_type = payload.get("type", "text")
    
    if not content: raise HTTPException(400, "Content required")
    
    if p_type == "link" and "t.me/" not in content:
        raise HTTPException(400, "Invalid Telegram link. Must contain t.me/")
            
    await db_exec("INSERT INTO saved_posts(user_id, title, content, type) VALUES(%s,%s,%s,%s)", (target, title, content, p_type))
    return {"ok": True}



@app.post("/user/settings", dependencies=[Depends(auth)])
async def save_user_settings(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id"), x_stealth_id: str = Header(None, alias="X-Stealth-Id")):
    if not x_telegram_id: raise HTTPException(401)
    caller = int(x_telegram_id)
    target = int(x_stealth_id) if (x_stealth_id and caller == MAIN_ADMIN_ID) else caller
    settings_json = json.dumps(payload)
    await db_exec("UPDATE users SET settings_json=%s WHERE id=%s", (settings_json, target))
    return {"ok": True}

async def send_daily_notifications():
    import asyncio
    while True:
        await asyncio.sleep(43200) # প্রতি ১২ ঘণ্টায় (দিনে ২ বার)
        try:
            users = await db_fetch("SELECT id FROM users")
            for u in users:
                try:
                    await bot_client.send_message(int(u["id"]), "🛡️ **Telegram Safety Tip:** Keep your delay at least 10 minutes and batch size to 1 to avoid getting banned. 20 posts per minute is the maximum safe limit!")
                except: pass
        except: pass

@app.on_event("startup")
async def startup_event():
    global pool
    try:
        import aiomysql
        pool = await aiomysql.create_pool(
            host=DB_CFG.get("host", "127.0.0.1"),
            port=DB_CFG.get("port", 3306),
            user=DB_CFG.get("user", "root"),
            password=DB_CFG.get("password", ""),
            db=DB_CFG.get("db", "topupbuz_bot"),
            autocommit=True
        )
        print("✅ Database pool created successfully!")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
    
    # নোটিফিকেশন এবং বট চালু করা
    asyncio.create_task(send_daily_notifications())
    print("✅ Notification task started!")
    
    asyncio.create_task(start_bot())
    print("✅ Bot startup task triggered!")

@app.post("/admin/demote-user", dependencies=[Depends(auth)])
async def demote_user(payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    _require_admin(x_telegram_id)
    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(400, "user_id is required")
    await db_exec("UPDATE users SET plan='unverified', plan_expiry=0 WHERE id=%s", (uid,))
    return {"ok": True, "message": f"User {uid} successfully demoted to unverified"}

@app.put("/folders/{folder_id}", dependencies=[Depends(auth)])
async def update_folder(folder_id: int, payload: dict, x_telegram_id: str = Header(None, alias="X-Telegram-Id")):
    uid = int(x_telegram_id)
    name = payload.get("name")
    groups = json.dumps(payload.get("groups", []))
    await db_exec("UPDATE folders SET name=%s, groups_json=%s WHERE id=%s AND user_id=%s", (name, groups, folder_id, uid))
    return {"ok": True}
