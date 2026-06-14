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
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    height:100vh;display:flex;flex-direction:column;background:#f4f5f7;color:#1a1a2e
  }
  header{
    background:#1a1a2e;color:#fff;padding:14px 24px;
    display:flex;align-items:center;justify-content:space-between;
    box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0
  }
  header h1{font-size:17px;font-weight:600;letter-spacing:.3px}
  header span{font-size:12px;opacity:.6;margin-left:10px}
  #new-chat{
    background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);
    color:#fff;padding:6px 14px;border-radius:7px;cursor:pointer;font-size:13px;
    transition:background .15s
  }
  #new-chat:hover{background:rgba(255,255,255,.22)}

  #chat{flex:1;overflow-y:auto;padding:28px 24px;display:flex;flex-direction:column;gap:20px}

  .msg{max-width:760px;display:flex;flex-direction:column}
  .msg.user{align-self:flex-end;align-items:flex-end}
  .msg.agent{align-self:flex-start;align-items:flex-start}
  .lbl{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
       color:#888;margin-bottom:5px}
  .bubble{
    padding:12px 16px;border-radius:16px;font-size:15px;line-height:1.6;
    max-width:640px;white-space:pre-wrap;word-break:break-word
  }
  .msg.user .bubble{background:#1a1a2e;color:#fff;border-bottom-right-radius:4px}
  .msg.agent .bubble{
    background:#fff;color:#1a1a2e;border-bottom-left-radius:4px;
    box-shadow:0 1px 5px rgba(0,0,0,.08)
  }
  .cursor{
    display:inline-block;width:2px;height:15px;background:currentColor;
    margin-left:2px;vertical-align:middle;animation:blink 1s step-end infinite
  }
  @keyframes blink{50%{opacity:0}}

  #welcome{
    text-align:center;padding:60px 24px;color:#666;flex:1;
    display:flex;flex-direction:column;align-items:center;justify-content:center
  }
  #welcome h2{font-size:24px;color:#1a1a2e;margin-bottom:10px;font-weight:600}
  #welcome p{font-size:15px;max-width:440px;line-height:1.6}
  .examples{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:24px}
  .ex-btn{
    background:#fff;border:1.5px solid #e0e0e6;padding:9px 16px;border-radius:20px;
    font-size:13px;cursor:pointer;color:#444;transition:border-color .15s,background .15s
  }
  .ex-btn:hover{border-color:#1a1a2e;background:#f0f0f5;color:#1a1a2e}

  #input-area{
    padding:14px 24px;background:#fff;border-top:1px solid #e5e7eb;
    display:flex;gap:10px;align-items:flex-end;flex-shrink:0
  }
  #msg-input{
    flex:1;border:1.5px solid #e0e0e6;border-radius:12px;padding:11px 14px;
    font-size:15px;font-family:inherit;resize:none;min-height:46px;max-height:180px;
    outline:none;transition:border-color .2s;background:#fafafa;line-height:1.5
  }
  #msg-input:focus{border-color:#1a1a2e;background:#fff}
  #send{
    background:#1a1a2e;color:#fff;border:none;border-radius:10px;
    padding:0 20px;height:46px;font-size:15px;cursor:pointer;white-space:nowrap;
    transition:background .15s;flex-shrink:0
  }
  #send:hover:not(:disabled){background:#2d2d50}
  #send:disabled{background:#c0c0cc;cursor:not-allowed}

  .error{color:#c0392b;font-style:italic}
</style>
</head>
<body>
<header>
  <div><h1>&#x1F4B1; Claude Forex Agent</h1><span>Powered by Anthropic Managed Agents</span></div>
  <button id="new-chat" onclick="newChat()">New Chat</button>
</header>

<div id="chat">
  <div id="welcome">
    <h2>Foreign Exchange Assistant</h2>
    <p>Ask me about live exchange rates, currency conversions, historical data, and FX markets.</p>
    <div class="examples">
      <button class="ex-btn" onclick="useExample(this)">What is USD/EUR today?</button>
      <button class="ex-btn" onclick="useExample(this)">Convert 500 GBP to JPY</button>
      <button class="ex-btn" onclick="useExample(this)">USD/CAD rate last 7 days</button>
      <button class="ex-btn" onclick="useExample(this)">List all currencies</button>
    </div>
  </div>
</div>

<div id="input-area">
  <textarea id="msg-input" placeholder="Ask about exchange rates…" rows="1"
    onkeydown="onKey(event)" oninput="resize(this)"></textarea>
  <button id="send" onclick="send()">Send</button>
</div>

<script>
let sessionId = null;
let busy = false;

async function initSession() {
  try {
    const r = await fetch('/api/session', {method:'POST'});
    const d = await r.json();
    sessionId = d.session_id || null;
  } catch(e) {
    console.error('Session init failed:', e);
  }
}

function newChat() {
  sessionId = null;
  document.getElementById('chat').innerHTML = `
    <div id="welcome">
      <h2>Foreign Exchange Assistant</h2>
      <p>Ask about rates, conversions, historical data, and FX markets.</p>
      <div class="examples">
        <button class="ex-btn" onclick="useExample(this)">What is USD/EUR today?</button>
        <button class="ex-btn" onclick="useExample(this)">Convert 500 GBP to JPY</button>
        <button class="ex-btn" onclick="useExample(this)">USD/CAD rate last 7 days</button>
        <button class="ex-btn" onclick="useExample(this)">List all currencies</button>
      </div>
    </div>`;
  initSession();
}

function useExample(btn) {
  document.getElementById('msg-input').value = btn.textContent;
  send();
}

function resize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
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
  d.innerHTML = '<div class="lbl">' + (role==='user'?'You':'Agent') + '</div>'
              + '<div class="bubble"></div>';
  d.querySelector('.bubble').textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d.querySelector('.bubble');
}

async function send() {
  const input = document.getElementById('msg-input');
  const message = input.value.trim();
  if (!message || busy) return;
  if (!sessionId) { await initSession(); }

  input.value = '';
  input.style.height = 'auto';
  busy = true;
  document.getElementById('send').disabled = true;

  addMsg('user', message);

  const chat = document.getElementById('chat');
  const d = document.createElement('div');
  d.className = 'msg agent';
  d.innerHTML = '<div class="lbl">Agent</div>'
             + '<div class="bubble"><span class="cursor"></span></div>';
  chat.appendChild(d);
  const bubble = d.querySelector('.bubble');
  chat.scrollTop = chat.scrollHeight;

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({session_id: sessionId, message}),
    });

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '', text = '';

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
            text += ev.text;
            bubble.textContent = text;
            const c = document.createElement('span');
            c.className = 'cursor';
            bubble.appendChild(c);
            chat.scrollTop = chat.scrollHeight;
          } else if (ev.type === 'error') {
            bubble.innerHTML = '<span class="error">Error: ' + ev.message + '</span>';
          }
        } catch(_) {}
      }
    }
  } catch(e) {
    bubble.innerHTML = '<span class="error">Connection error. Please try again.</span>';
  }

  const cur = bubble.querySelector('.cursor');
  if (cur) cur.remove();
  busy = false;
  document.getElementById('send').disabled = false;
  document.getElementById('msg-input').focus();
}

initSession();
</script>
</body>
</html>"""
