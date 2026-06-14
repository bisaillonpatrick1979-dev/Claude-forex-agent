"""FastAPI web server — streaming chat UI backed by a Managed Agent session."""

import json
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from claude_forex_agent.managed_agent import ForexManagedAgent

load_dotenv()

app = FastAPI(title="Claude Forex Agent")

_managed: ForexManagedAgent | None = None


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ValueError(
            f"{name} is not set. Run 'python setup_agent.py --write' first."
        )
    return value


def get_managed() -> ForexManagedAgent:
    global _managed
    if _managed is None:
        client = anthropic.Anthropic(api_key=_require_env("ANTHROPIC_API_KEY"))
        _managed = ForexManagedAgent(
            client=client,
            agent_id=_require_env("MANAGED_AGENT_ID"),
            agent_version=int(_require_env("MANAGED_AGENT_VERSION")),
            env_id=_require_env("MANAGED_AGENT_ENV_ID"),
        )
    return _managed


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return CHAT_HTML


@app.post("/api/session")
def create_session() -> dict:
    try:
        session_id = get_managed().create_session()
        return {"session_id": session_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    def generate():
        try:
            for event_type, data in get_managed().stream_response(req.session_id, req.message):
                if event_type == "text":
                    yield f"data: {json.dumps({'type': 'text', 'text': data})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        yield 'data: {"type":"done"}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


CHAT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Forex Agent</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
:root{
  --bg:#f4f5f7;--surface:#fff;--border:#e5e7eb;--text:#1a1a2e;
  --accent:#1a1a2e;--accent-hover:#2d2d50;--muted:#888;
  --user-bg:#1a1a2e;--user-text:#fff;
  --agent-bg:#fff;--agent-text:#1a1a2e;
  --radius:16px;--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);height:100vh;display:flex;flex-direction:column;
     background:var(--bg);color:var(--text);overflow:hidden}

/* ── Header ── */
header{
  background:var(--accent);color:#fff;padding:13px 20px;flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between;
  box-shadow:0 2px 10px rgba(0,0,0,.2)
}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-left h1{font-size:16px;font-weight:600;letter-spacing:.2px}
.hdr-left span{font-size:11px;opacity:.55;background:rgba(255,255,255,.12);
               padding:2px 8px;border-radius:10px}
#new-chat{
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
  color:#fff;padding:5px 13px;border-radius:7px;cursor:pointer;font-size:13px;
  transition:background .15s
}
#new-chat:hover{background:rgba(255,255,255,.2)}

/* ── Chat area ── */
#chat{
  flex:1;overflow-y:auto;padding:24px 20px;
  display:flex;flex-direction:column;gap:18px;min-height:0
}

/* ── Welcome ── */
#welcome{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;text-align:center;padding:40px 20px;color:#666
}
#welcome h2{font-size:22px;color:var(--text);font-weight:600;margin-bottom:8px}
#welcome p{font-size:14px;max-width:400px;line-height:1.6;color:#777}
.examples{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px}
.ex{
  background:var(--surface);border:1.5px solid var(--border);
  padding:8px 15px;border-radius:18px;font-size:13px;cursor:pointer;
  color:#555;transition:border-color .15s,background .15s;white-space:nowrap
}
.ex:hover{border-color:var(--accent);background:#f0f0f8;color:var(--accent)}

/* ── Messages ── */
.msg{max-width:780px;display:flex;flex-direction:column}
.msg.user{align-self:flex-end;align-items:flex-end}
.msg.agent{align-self:flex-start;align-items:flex-start}
.lbl{font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;
     color:var(--muted);margin-bottom:4px}
.bubble{
  padding:11px 15px;border-radius:var(--radius);font-size:15px;
  line-height:1.65;max-width:680px;position:relative
}
.msg.user .bubble{
  background:var(--user-bg);color:var(--user-text);
  border-bottom-right-radius:4px;white-space:pre-wrap;word-break:break-word
}
.msg.agent .bubble{
  background:var(--agent-bg);color:var(--agent-text);
  border-bottom-left-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.07)
}

/* ── Markdown styles inside agent bubbles ── */
.bubble h1,.bubble h2,.bubble h3{
  font-weight:600;margin:14px 0 6px;color:var(--text)
}
.bubble h1{font-size:17px} .bubble h2{font-size:16px} .bubble h3{font-size:15px}
.bubble p{margin-bottom:10px}
.bubble p:last-child{margin-bottom:0}
.bubble ul,.bubble ol{padding-left:20px;margin-bottom:10px}
.bubble li{margin-bottom:3px}
.bubble table{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}
.bubble th,.bubble td{border:1px solid #ddd;padding:6px 10px;text-align:left}
.bubble th{background:#f4f5f7;font-weight:600}
.bubble code{
  background:#f0f0f6;padding:1px 5px;border-radius:4px;
  font-family:'SF Mono',Consolas,monospace;font-size:13px
}
.bubble pre{
  background:#f0f0f6;padding:10px 12px;border-radius:8px;overflow-x:auto;
  margin:8px 0
}
.bubble pre code{background:none;padding:0}
.bubble strong{font-weight:600}
.bubble blockquote{
  border-left:3px solid #ddd;padding-left:12px;color:#666;margin:8px 0
}

/* ── Streaming cursor ── */
.cursor{
  display:inline-block;width:2px;height:15px;background:currentColor;
  margin-left:2px;vertical-align:middle;animation:blink 1s step-end infinite
}
@keyframes blink{50%{opacity:0}}

/* ── Copy button ── */
.copy-btn{
  position:absolute;top:8px;right:8px;
  background:rgba(0,0,0,.06);border:none;border-radius:5px;
  padding:3px 8px;font-size:11px;cursor:pointer;color:#666;
  opacity:0;transition:opacity .15s
}
.bubble:hover .copy-btn{opacity:1}
.copy-btn:hover{background:rgba(0,0,0,.12);color:#333}
.copy-btn.copied{color:#2ecc71}

/* ── Error ── */
.err{color:#c0392b;font-style:italic}

/* ── Typing dots ── */
.dots span{
  display:inline-block;width:6px;height:6px;background:#bbb;border-radius:50%;
  margin:0 2px;animation:dot .9s ease-in-out infinite
}
.dots span:nth-child(2){animation-delay:.15s}
.dots span:nth-child(3){animation-delay:.3s}
@keyframes dot{0%,80%,100%{transform:scale(.8);opacity:.4}40%{transform:scale(1);opacity:1}}

/* ── Input area ── */
#input-area{
  padding:12px 20px;background:var(--surface);border-top:1px solid var(--border);
  display:flex;gap:9px;align-items:flex-end;flex-shrink:0
}
#msg{
  flex:1;border:1.5px solid var(--border);border-radius:12px;
  padding:10px 14px;font-size:15px;font-family:var(--font);
  resize:none;min-height:44px;max-height:160px;outline:none;
  transition:border-color .2s;background:#fafafa;line-height:1.5
}
#msg:focus{border-color:var(--accent);background:#fff}
#send{
  background:var(--accent);color:#fff;border:none;border-radius:10px;
  padding:0 18px;height:44px;font-size:15px;cursor:pointer;
  transition:background .15s;flex-shrink:0
}
#send:hover:not(:disabled){background:var(--accent-hover)}
#send:disabled{background:#c0c0cc;cursor:not-allowed}
</style>
</head>
<body>
<header>
  <div class="hdr-left">
    <h1>&#x1F4B1; Claude Forex Agent</h1>
    <span>Managed Agents</span>
  </div>
  <button id="new-chat" onclick="newChat()">&#x2B; New Chat</button>
</header>

<div id="chat">
  <div id="welcome">
    <h2>Foreign Exchange Assistant</h2>
    <p>Ask about live rates, conversions, historical trends, and in-depth FX analysis.</p>
    <div class="examples">
      <button class="ex" onclick="useEx(this)">USD/EUR rate today</button>
      <button class="ex" onclick="useEx(this)">Convert 1000 GBP to JPY</button>
      <button class="ex" onclick="useEx(this)">USD/CAD trend last 30 days</button>
      <button class="ex" onclick="useEx(this)">Analyze EUR/GBP vs EUR/CHF</button>
      <button class="ex" onclick="useEx(this)">List all supported currencies</button>
    </div>
  </div>
</div>

<div id="input-area">
  <textarea id="msg" placeholder="Ask about exchange rates…" rows="1"
    onkeydown="onKey(event)" oninput="resize(this)"></textarea>
  <button id="send" onclick="send()">Send</button>
</div>

<script>
// Configure marked for safe rendering
marked.setOptions({breaks: true, gfm: true});

let sessionId = null, busy = false;

async function initSession() {
  try {
    const r = await fetch('/api/session', {method: 'POST'});
    const d = await r.json();
    sessionId = d.session_id || null;
  } catch(e) { console.error('Session init failed:', e); }
}

function newChat() {
  sessionId = null;
  document.getElementById('chat').innerHTML = `
    <div id="welcome">
      <h2>Foreign Exchange Assistant</h2>
      <p>Ask about live rates, conversions, historical trends, and in-depth FX analysis.</p>
      <div class="examples">
        <button class="ex" onclick="useEx(this)">USD/EUR rate today</button>
        <button class="ex" onclick="useEx(this)">Convert 1000 GBP to JPY</button>
        <button class="ex" onclick="useEx(this)">USD/CAD trend last 30 days</button>
        <button class="ex" onclick="useEx(this)">Analyze EUR/GBP vs EUR/CHF</button>
        <button class="ex" onclick="useEx(this)">List all supported currencies</button>
      </div>
    </div>`;
  initSession();
}

function useEx(btn) {
  document.getElementById('msg').value = btn.textContent;
  send();
}

function resize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function onKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
}

function addMsg(role, text) {
  const chat = document.getElementById('chat');
  const w = document.getElementById('welcome');
  if (w) w.remove();
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = '<div class="lbl">' + (role === 'user' ? 'You' : 'Agent') + '</div>'
              + '<div class="bubble"></div>';
  d.querySelector('.bubble').textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d.querySelector('.bubble');
}

function addAgentBubble() {
  const chat = document.getElementById('chat');
  const w = document.getElementById('welcome');
  if (w) w.remove();
  const d = document.createElement('div');
  d.className = 'msg agent';
  d.innerHTML = '<div class="lbl">Agent</div>'
    + '<div class="bubble">'
    + '<div class="dots"><span></span><span></span><span></span></div>'
    + '</div>';
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d.querySelector('.bubble');
}

function copyText(btn) {
  const raw = btn.dataset.raw || '';
  navigator.clipboard.writeText(raw).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  });
}

async function send() {
  const input = document.getElementById('msg');
  const message = input.value.trim();
  if (!message || busy) return;
  if (!sessionId) { await initSession(); }

  input.value = '';
  input.style.height = 'auto';
  busy = true;
  document.getElementById('send').disabled = true;

  addMsg('user', message);
  const bubble = addAgentBubble();

  let text = '';
  let started = false;

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({session_id: sessionId, message}),
    });

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const chat = document.getElementById('chat');

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream: true});
      const lines = buf.split('\\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === 'text') {
            if (!started) {
              // Remove the typing dots, add cursor for streaming
              bubble.innerHTML = '<span class="cursor"></span>';
              started = true;
            }
            text += ev.text;
            bubble.textContent = text;
            const c = document.createElement('span');
            c.className = 'cursor';
            bubble.appendChild(c);
            chat.scrollTop = chat.scrollHeight;
          } else if (ev.type === 'done') {
            // Render markdown and add copy button
            bubble.innerHTML = marked.parse(text)
              + '<button class="copy-btn" data-raw="" onclick="copyText(this)">Copy</button>';
            bubble.querySelector('.copy-btn').dataset.raw = text;
            chat.scrollTop = chat.scrollHeight;
          } else if (ev.type === 'error') {
            bubble.innerHTML = '<span class="err">Error: ' + ev.message + '</span>';
          }
        } catch(_) {}
      }
    }
  } catch(e) {
    bubble.innerHTML = '<span class="err">Connection error. Please try again.</span>';
  }

  busy = false;
  document.getElementById('send').disabled = false;
  document.getElementById('msg').focus();
}

initSession();
</script>
</body>
</html>"""
