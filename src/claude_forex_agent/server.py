"""FastAPI server — professional forex trading terminal with Claude AI assistant."""

import json
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from claude_forex_agent.alphavantage import get_fx_daily, get_fx_intraday
from claude_forex_agent.managed_agent import ForexManagedAgent

load_dotenv()

app = FastAPI(title="Forex Terminal")

_managed: ForexManagedAgent | None = None

FOREX_PAIRS = [
    "EURUSD", "USDJPY", "GBPUSD", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "EURAUD", "EURCHF", "EURCAD",
    "GBPAUD", "GBPCAD", "GBPCHF", "AUDJPY", "AUDCAD", "AUDNZD", "AUDCHF",
    "CADJPY", "CHFJPY", "NZDJPY", "NZDCAD", "NZDCHF",
]

INTERVAL_MAP = {
    "1m": "1min", "5m": "5min", "15m": "15min",
    "30m": "30min", "1h": "60min", "1D": "1D",
}


def _require_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise ValueError(f"{name} is not set. Run 'python setup_agent.py --write' first.")
    return v


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
    return TERMINAL_HTML


@app.get("/api/pairs")
def list_pairs() -> dict:
    return {"pairs": FOREX_PAIRS}


@app.get("/api/candles")
def get_candles(pair: str = "EURUSD", interval: str = "5m") -> dict:
    api_key = os.environ.get("ALPHAVANTAGE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ALPHAVANTAGE_API_KEY not configured.")
    av_interval = INTERVAL_MAP.get(interval, "5min")
    from_sym, to_sym = pair[:3].upper(), pair[3:6].upper()
    if av_interval == "1D":
        data = get_fx_daily(api_key, from_sym, to_sym)
    else:
        data = get_fx_intraday(api_key, from_sym, to_sym, av_interval)
    if "error" in data:
        if data["error"] == "RATE_LIMIT":
            raise HTTPException(
                status_code=429,
                detail=(
                    "Alpha Vantage free tier limit reached (25 requests/day). "
                    "Data will reload from cache if available, or try again tomorrow. "
                    "Upgrade at alphavantage.co/premium for unlimited access."
                ),
            )
        raise HTTPException(status_code=503, detail=data["error"])
    return data


@app.post("/api/session")
def create_session() -> dict:
    try:
        return {"session_id": get_managed().create_session()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    def generate():
        try:
            for kind, data in get_managed().stream_response(req.session_id, req.message):
                if kind == "text":
                    yield f"data: {json.dumps({'type': 'text', 'text': data})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        yield 'data: {"type":"done"}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Trading Terminal HTML — single-file SPA
# ---------------------------------------------------------------------------
TERMINAL_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forex Terminal</title>
<script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
:root{
  --bg:#0b0e1a;--surface:#131722;--panel:#1a1f33;--border:#252d45;
  --text:#d1d5db;--muted:#6b7280;--accent:#2962ff;
  --green:#26a69a;--red:#ef5350;--yellow:#ffd600;
  --purple:#9c27b0;--orange:#ff9800;--pink:#e91e63;--sky:#00bcd4;
  --font:'Inter',system-ui,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--text);
          font-family:var(--font);font-size:13px}

/* ── App layout ── */
#app{display:flex;flex-direction:column;height:100%}

/* ── Top bar ── */
#topbar{
  background:var(--surface);border-bottom:1px solid var(--border);
  height:46px;display:flex;align-items:center;gap:6px;padding:0 12px;
  flex-shrink:0;user-select:none
}
#logo{font-size:15px;font-weight:700;color:var(--accent);margin-right:8px;white-space:nowrap}
#cur-pair{font-size:16px;font-weight:700;color:#fff;min-width:90px}
.sep{width:1px;height:22px;background:var(--border);margin:0 4px}

/* Timeframe buttons */
.tf-btn{
  background:none;border:1px solid transparent;color:var(--muted);
  padding:4px 9px;border-radius:5px;cursor:pointer;font-size:12px;
  transition:all .12s
}
.tf-btn:hover{color:var(--text);border-color:var(--border)}
.tf-btn.on{color:#fff;background:var(--accent);border-color:var(--accent)}

/* Indicator + tool buttons */
.ind-btn,.tool-btn{
  background:none;border:1px solid var(--border);color:var(--muted);
  padding:3px 9px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;
  transition:all .12s;letter-spacing:.3px
}
.ind-btn:hover,.tool-btn:hover{color:var(--text)}
.ind-btn.on{color:#fff;border-color:currentColor}
.ind-btn.bb.on{color:var(--purple)}
.ind-btn.ma20.on{color:var(--accent)}
.ind-btn.ma50.on{color:var(--orange)}
.ind-btn.ma200.on{color:var(--pink)}
.ind-btn.rsi.on{color:var(--sky)}
.ind-btn.macd.on{color:var(--green)}
.tool-btn.on{color:var(--yellow);border-color:var(--yellow)}
#fib-hint{color:var(--yellow);font-size:11px;display:none;padding:0 6px}

#ai-toggle{
  margin-left:auto;background:var(--accent);border:none;color:#fff;
  padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
  white-space:nowrap
}
#ai-toggle:hover{background:#1e50d4}

/* ── Body ── */
#body{flex:1;display:flex;overflow:hidden}

/* ── Pair sidebar ── */
#sidebar{
  width:140px;background:var(--surface);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0
}
#pair-search{
  width:100%;background:var(--panel);border:none;border-bottom:1px solid var(--border);
  color:var(--text);padding:8px 10px;font-size:12px;outline:none
}
#pair-search::placeholder{color:var(--muted)}
#pair-list{overflow-y:auto;flex:1}
.pair-item{
  padding:7px 10px;cursor:pointer;color:var(--muted);font-size:12px;
  transition:background .1s;border-left:2px solid transparent
}
.pair-item:hover{background:var(--panel);color:var(--text)}
.pair-item.on{background:var(--panel);color:#fff;border-left-color:var(--accent)}

/* ── Chart area ── */
#chart-area{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}

/* info bar */
#info-bar{
  height:26px;background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:14px;padding:0 12px;flex-shrink:0;
  font-size:12px;font-family:monospace
}
.info-o{color:var(--text)} .info-h{color:var(--green)} .info-l{color:var(--red)}
.info-c{color:var(--text)} #info-chg{font-weight:600}
#error-bar{
  display:none;background:#3d1a1a;color:#f87171;border-bottom:1px solid #7f1d1d;
  padding:6px 12px;font-size:12px
}

/* charts */
#main-chart{flex:1;min-height:200px}
#rsi-pane{height:110px;display:none;border-top:1px solid var(--border)}
#macd-pane{height:110px;display:none;border-top:1px solid var(--border)}

/* loading overlay */
#loading{
  position:absolute;inset:0;background:rgba(11,14,26,.7);
  display:none;align-items:center;justify-content:center;z-index:10
}
.spinner{
  width:32px;height:32px;border:3px solid var(--border);
  border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── AI Chat panel ── */
#ai-panel{
  width:320px;background:var(--surface);border-left:1px solid var(--border);
  display:none;flex-direction:column;flex-shrink:0
}
#ai-panel.open{display:flex}
#ai-header{
  padding:10px 14px;border-bottom:1px solid var(--border);
  font-weight:600;font-size:13px;color:#fff;
  display:flex;align-items:center;justify-content:space-between
}
#ai-close{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px}
#ai-close:hover{color:var(--text)}
#ai-msgs{
  flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px
}
.ai-msg{display:flex;flex-direction:column;gap:4px}
.ai-role{font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
         color:var(--muted)}
.ai-bubble{
  background:var(--panel);padding:10px 12px;border-radius:10px;
  font-size:13px;line-height:1.6;color:var(--text)
}
.ai-bubble.user{background:var(--accent);color:#fff;align-self:flex-end}
/* markdown inside AI bubble */
.ai-bubble h1,.ai-bubble h2,.ai-bubble h3{font-size:13px;font-weight:700;
  margin:8px 0 4px;color:#fff}
.ai-bubble p{margin-bottom:6px}.ai-bubble p:last-child{margin:0}
.ai-bubble ul,.ai-bubble ol{padding-left:16px;margin-bottom:6px}
.ai-bubble li{margin-bottom:2px}
.ai-bubble table{border-collapse:collapse;width:100%;margin:6px 0;font-size:12px}
.ai-bubble th,.ai-bubble td{border:1px solid var(--border);padding:4px 8px}
.ai-bubble th{background:var(--surface)}
.ai-bubble code{background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px;
                font-size:12px}
.ai-bubble strong{color:#fff}
.dots span{display:inline-block;width:5px;height:5px;background:var(--muted);
           border-radius:50%;margin:0 1px;animation:dot .9s ease-in-out infinite}
.dots span:nth-child(2){animation-delay:.15s}
.dots span:nth-child(3){animation-delay:.3s}
@keyframes dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}
#ai-input-row{
  padding:10px;border-top:1px solid var(--border);display:flex;gap:8px
}
#ai-input{
  flex:1;background:var(--panel);border:1px solid var(--border);
  border-radius:8px;color:var(--text);padding:8px 10px;
  font-size:13px;font-family:var(--font);resize:none;outline:none;
  max-height:100px;min-height:36px;line-height:1.4
}
#ai-input:focus{border-color:var(--accent)}
#ai-send{
  background:var(--accent);border:none;color:#fff;border-radius:8px;
  padding:8px 14px;cursor:pointer;font-size:13px
}
#ai-send:disabled{background:var(--border);cursor:not-allowed}

/* ── Portfolio pane ── */
#portfolio-pane{
  border-top:1px solid var(--border);background:var(--surface);flex-shrink:0
}
.port-hdr{
  display:flex;align-items:center;gap:10px;padding:7px 12px;
  border-bottom:1px solid var(--border);flex-wrap:wrap
}
.port-bal{font-size:13px;font-weight:700;color:#fff;white-space:nowrap}
#trade-sz{
  background:var(--panel);border:1px solid var(--border);color:var(--text);
  padding:3px 7px;border-radius:5px;width:80px;font-size:12px;outline:none
}
.btn-long,.btn-short{
  border:none;padding:4px 12px;border-radius:5px;
  cursor:pointer;font-size:12px;font-weight:600
}
.btn-long{background:#26a69a;color:#fff}
.btn-long:hover{background:#1f8e84}
.btn-short{background:#ef5350;color:#fff}
.btn-short:hover{background:#d32f2f}
.btn-rst{
  background:var(--panel);border:1px solid var(--border);
  color:var(--muted);padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px
}
.btn-rst:hover{color:var(--text)}
#pnl-total{margin-left:auto;font-size:12px;font-weight:700}
.port-table{width:100%;border-collapse:collapse;font-size:12px}
.port-table th{
  color:var(--muted);font-weight:500;padding:4px 10px;text-align:left;
  border-bottom:1px solid var(--border);background:var(--panel)
}
.port-table td{padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.04)}
.port-table tr:last-child td{border-bottom:none}
.port-wrap{max-height:130px;overflow-y:auto}
.port-empty{
  color:var(--muted);font-size:12px;padding:12px;text-align:center
}
.btn-close-pos{
  background:#3d1a1a;border:1px solid #7f1d1d;color:#f87171;
  padding:2px 7px;border-radius:4px;cursor:pointer;font-size:11px
}
#refresh-cd{
  color:var(--muted);font-size:11px;white-space:nowrap;padding:0 6px
}
/* ── Toast ── */
.toast{
  position:fixed;top:56px;right:16px;z-index:1000;background:#ffd600;
  color:#000;padding:9px 16px;border-radius:8px;font-weight:600;
  font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.4);
  animation:toastIn .2s ease
}
@keyframes toastIn{
  from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}
}
</style>
</head>
<body>
<div id="app">

<!-- ── Top bar ── -->
<div id="topbar">
  <span id="logo">&#x1F4B9; ForexAI</span>
  <span id="cur-pair">EUR/USD</span>
  <div class="sep"></div>

  <!-- Timeframes -->
  <button class="tf-btn" data-tf="1m" onclick="setTF(this)">1m</button>
  <button class="tf-btn on" data-tf="5m" onclick="setTF(this)">5m</button>
  <button class="tf-btn" data-tf="15m" onclick="setTF(this)">15m</button>
  <button class="tf-btn" data-tf="30m" onclick="setTF(this)">30m</button>
  <button class="tf-btn" data-tf="1h" onclick="setTF(this)">1h</button>
  <button class="tf-btn" data-tf="1D" onclick="setTF(this)">1D</button>
  <div class="sep"></div>

  <!-- Indicators -->
  <button class="ind-btn bb" id="ind-bb" onclick="toggleBB()">BB</button>
  <button class="ind-btn ma20 on" id="ind-ma20" onclick="toggleMA(20)">MA20</button>
  <button class="ind-btn ma50" id="ind-ma50" onclick="toggleMA(50)">MA50</button>
  <button class="ind-btn ma200" id="ind-ma200" onclick="toggleMA(200)">MA200</button>
  <button class="ind-btn rsi" id="ind-rsi" onclick="toggleRSI()">RSI</button>
  <button class="ind-btn macd" id="ind-macd" onclick="toggleMACD()">MACD</button>
  <div class="sep"></div>

  <!-- Drawing tools -->
  <button class="tool-btn" id="tool-hline" onclick="setTool('hline')"
    title="Horizontal line">&#x2014;</button>
  <button class="tool-btn" id="tool-fib" onclick="setTool('fib')"
    title="Fibonacci retracement">Fib</button>
  <button class="tool-btn" id="tool-tl" onclick="setTool('tl')"
    title="Trend line">&#x2197;</button>
  <button class="tool-btn" onclick="clearDrawings()" title="Clear drawings">&#x2715;</button>
  <span id="fib-hint">Click 2nd point</span>

  <div class="sep"></div>
  <button class="ind-btn" id="btn-port"
    onclick="togglePortfolio()">&#x1F4BC; Portfolio</button>
  <button class="ind-btn"
    onclick="showAlertDialog()">&#x1F514; Alerte</button>
  <span id="refresh-cd"></span>
  <button id="ai-toggle" onclick="toggleAI()">&#x1F916; AI Analyst</button>
</div>

<!-- ── Body ── -->
<div id="body">

  <!-- Pair sidebar -->
  <aside id="sidebar">
    <input id="pair-search" placeholder="Search..." oninput="filterPairs(this.value)">
    <div id="pair-list"></div>
  </aside>

  <!-- Chart area -->
  <div id="chart-area">
    <div id="error-bar"></div>
    <div id="info-bar">
      <span class="info-o" id="ib-o">O —</span>
      <span class="info-h" id="ib-h">H —</span>
      <span class="info-l" id="ib-l">L —</span>
      <span class="info-c" id="ib-c">C —</span>
      <span id="info-chg">—</span>
    </div>
    <div id="main-chart"></div>
    <div id="rsi-pane"></div>
    <div id="macd-pane"></div>
    <div id="portfolio-pane" style="display:none">
      <div class="port-hdr">
        <span class="port-bal">
          Solde: <span id="bal-disp">$10,000.00</span>
        </span>
        <input id="trade-sz" type="number" value="1000"
          min="100" step="100" placeholder="USD">
        <button class="btn-long"
          onclick="openPos('long')">&#x25B2; Long</button>
        <button class="btn-short"
          onclick="openPos('short')">&#x25BC; Short</button>
        <span id="pnl-total"></span>
        <button class="btn-rst"
          onclick="resetPort()">Reset $10k</button>
      </div>
      <div class="port-wrap">
        <table class="port-table">
          <thead><tr>
            <th>Paire</th><th>Direction</th><th>USD</th>
            <th>Entr&#233;e</th><th>Actuel</th><th>P&amp;L</th><th></th>
          </tr></thead>
          <tbody id="port-body">
            <tr><td colspan="7" class="port-empty">
              Aucune position ouverte.
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div id="loading"><div class="spinner"></div></div>
  </div>

  <!-- AI Chat panel -->
  <div id="ai-panel">
    <div id="ai-header">
      <span>&#x1F916; Claude AI Analyst</span>
      <button id="ai-close" onclick="toggleAI()">&#x2715;</button>
    </div>
    <div id="ai-msgs">
      <div class="ai-msg">
        <div class="ai-role">Agent</div>
        <div class="ai-bubble">
          Hello! I can analyze any forex pair, explain technical levels,
          fetch live rates, or discuss market trends. What would you like to know?
        </div>
      </div>
    </div>
    <div id="ai-input-row">
      <textarea id="ai-input" rows="1" placeholder="Ask about the chart…"
        onkeydown="aiKey(event)" oninput="aiResize(this)"></textarea>
      <button id="ai-send" onclick="aiSend()">&#x27A4;</button>
    </div>
  </div>

</div><!-- body -->
</div><!-- app -->

<script>
'use strict';

/* =====================================================================
   State
===================================================================== */
let currentPair = 'EURUSD', currentTF = '5m', candles = [];
let activeTool = null, fibPt1 = null, tlPt1 = null;
let hLines = [], fibLines = [], tlSeries = [];
let showBB = false, showMA20 = true, showMA50 = false, showMA200 = false;
let showRSI = false, showMACD = false;
let sessionId = null, aiBusy = false;
let PAIRS = [];

/* =====================================================================
   Chart objects
===================================================================== */
let mainChart, candleSeries;
let bbUp, bbMid, bbLo, ma20s, ma50s, ma200s;
let rsiChart, rsiSeries;
let macdChart, macdLine, macdSig, macdHist;

/* =====================================================================
   Lightweight Charts helpers
===================================================================== */
const BASE_OPTS = {
  layout:{background:{type:'solid',color:'#0b0e1a'},textColor:'#9ca3af'},
  grid:{vertLines:{color:'#1a1f33'},horzLines:{color:'#1a1f33'}},
  crosshair:{mode:LightweightCharts.CrosshairMode.Normal},
  rightPriceScale:{borderColor:'#252d45'},
  timeScale:{borderColor:'#252d45',timeVisible:true,secondsVisible:false},
  handleScroll:true,handleScale:true,
};

function chartSize(el){
  return {width:el.clientWidth||600, height:el.clientHeight||300};
}

function initMainChart(){
  const el = document.getElementById('main-chart');
  mainChart = LightweightCharts.createChart(el,{...BASE_OPTS,...chartSize(el)});

  candleSeries = mainChart.addCandlestickSeries({
    upColor:'#26a69a',downColor:'#ef5350',
    borderUpColor:'#26a69a',borderDownColor:'#ef5350',
    wickUpColor:'#26a69a',wickDownColor:'#ef5350',
  });

  // Overlay indicator series
  ma20s  = mainChart.addLineSeries({color:'#2962ff',lineWidth:1,title:'MA20',visible:true});
  ma50s  = mainChart.addLineSeries({color:'#ff9800',lineWidth:1,title:'MA50',visible:false});
  ma200s = mainChart.addLineSeries({color:'#e91e63',lineWidth:1,title:'MA200',visible:false});
  bbUp   = mainChart.addLineSeries({color:'#9c27b0',lineWidth:1,
    lineStyle:LightweightCharts.LineStyle.Dashed,title:'BB+',visible:false});
  bbMid  = mainChart.addLineSeries({color:'#9c27b0',lineWidth:1,title:'BB',visible:false});
  bbLo   = mainChart.addLineSeries({color:'#9c27b0',lineWidth:1,
    lineStyle:LightweightCharts.LineStyle.Dashed,title:'BB-',visible:false});

  // Crosshair → info bar
  mainChart.subscribeCrosshairMove(p => {
    if(p.seriesPrices && p.seriesPrices.has(candleSeries)){
      updateInfoBar(p.seriesPrices.get(candleSeries));
    }
  });

  // Click → drawing tools
  mainChart.subscribeClick(p => {
    if(!p.point || !p.time) return;
    const price = candleSeries.coordinateToPrice(p.point.y);
    if(price == null) return;
    handleClick(p.time, price, p.point);
  });

  new ResizeObserver(()=>{
    mainChart.applyOptions(chartSize(el));
  }).observe(el);
}

function initRSI(){
  const el = document.getElementById('rsi-pane');
  rsiChart = LightweightCharts.createChart(el,{
    ...BASE_OPTS,...chartSize(el),
    rightPriceScale:{...BASE_OPTS.rightPriceScale,scaleMargins:{top:.1,bottom:.1}},
    timeScale:{...BASE_OPTS.timeScale,visible:false},
  });
  rsiSeries = rsiChart.addLineSeries({color:'#00bcd4',lineWidth:1,title:'RSI(14)'});
  new ResizeObserver(()=>rsiChart.applyOptions(chartSize(el))).observe(el);
}

function initMACD(){
  const el = document.getElementById('macd-pane');
  macdChart = LightweightCharts.createChart(el,{
    ...BASE_OPTS,...chartSize(el),
    timeScale:{...BASE_OPTS.timeScale,visible:false},
  });
  macdLine = macdChart.addLineSeries({color:'#2962ff',lineWidth:1,title:'MACD'});
  macdSig  = macdChart.addLineSeries({color:'#ff9800',lineWidth:1,title:'Signal'});
  macdHist = macdChart.addHistogramSeries({
    color:'#26a69a',title:'Hist',
    priceFormat:{type:'price',precision:6,minMove:.000001},
  });
  new ResizeObserver(()=>macdChart.applyOptions(chartSize(el))).observe(el);
}

function syncTimeScales(){
  let syncing = false;
  function sync(src, ...targets){
    src.timeScale().subscribeVisibleLogicalRangeChange(range=>{
      if(syncing||!range) return;
      syncing=true;
      targets.forEach(c=>c.timeScale().setVisibleLogicalRange(range));
      syncing=false;
    });
  }
  sync(mainChart, rsiChart, macdChart);
  sync(rsiChart,  mainChart, macdChart);
  sync(macdChart, mainChart, rsiChart);
}

/* =====================================================================
   Technical indicators
===================================================================== */
function sma(arr, n){
  const r=[];
  for(let i=n-1;i<arr.length;i++){
    r.push(arr.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);
  }
  return r;
}

function ema(arr, n){
  if(arr.length<n) return [];
  const k=2/(n+1);
  let e=arr.slice(0,n).reduce((a,b)=>a+b,0)/n;
  const r=[e];
  for(let i=n;i<arr.length;i++){r.push(arr[i]*k+e*(1-k));e=r[r.length-1];}
  return r; // length = arr.length - n + 1
}

function withTime(candles, offset, values){
  return values.map((v,i)=>({time:candles[i+offset].time, value:v}));
}

function calcBB(candles,n=20,m=2){
  const cl=candles.map(c=>c.close), up=[], mid=[], lo=[];
  for(let i=n-1;i<candles.length;i++){
    const sl=cl.slice(i-n+1,i+1);
    const avg=sl.reduce((a,b)=>a+b,0)/n;
    const std=Math.sqrt(sl.reduce((s,v)=>s+(v-avg)**2,0)/n);
    up.push({time:candles[i].time,value:avg+m*std});
    mid.push({time:candles[i].time,value:avg});
    lo.push({time:candles[i].time,value:avg-m*std});
  }
  return{up,mid,lo};
}

function calcSMA(candles,n){
  const cl=candles.map(c=>c.close);
  return withTime(candles,n-1,sma(cl,n));
}

function calcRSI(candles,n=14){
  const cl=candles.map(c=>c.close);
  if(cl.length<=n) return [];
  let ag=0,al=0;
  for(let i=1;i<=n;i++){const d=cl[i]-cl[i-1];d>0?ag+=d:al-=d;}
  ag/=n;al/=n;
  const r=[{time:candles[n].time,value:100-100/(1+(al?ag/al:Infinity))}];
  for(let i=n+1;i<candles.length;i++){
    const d=cl[i]-cl[i-1];
    ag=(ag*(n-1)+(d>0?d:0))/n;
    al=(al*(n-1)+(d<0?-d:0))/n;
    r.push({time:candles[i].time,value:100-100/(1+(al?ag/al:Infinity))});
  }
  return r;
}

function calcMACD(candles,f=12,sl=26,sig=9){
  const cl=candles.map(c=>c.close);
  if(cl.length<sl+sig) return{macd:[],signal:[],hist:[]};
  const e12=ema(cl,f), e26=ema(cl,sl);
  const offset26=sl-1, diff=sl-f;
  const macdArr=e26.map((v,i)=>({time:candles[offset26+i].time,value:e12[i+diff]-v}));
  const raw=macdArr.map(p=>p.value);
  const sigE=ema(raw,sig);
  const offset2=sig-1;
  const signal=sigE.map((v,i)=>({time:macdArr[i+offset2].time,value:v}));
  const hist=sigE.map((v,i)=>{
    const mv=macdArr[i+offset2].value;
    return{time:macdArr[i+offset2].time,value:mv-v,color:(mv-v)>=0?'#26a69a':'#ef5350'};
  });
  return{macd:macdArr,signal,hist};
}

function updateIndicators(){
  if(!candles.length) return;
  ma20s.setData(calcSMA(candles,20));
  ma50s.setData(calcSMA(candles,50));
  ma200s.setData(calcSMA(candles,200));
  const bb=calcBB(candles);
  bbUp.setData(bb.up); bbMid.setData(bb.mid); bbLo.setData(bb.lo);
  rsiSeries.setData(calcRSI(candles));
  const {macd,signal,hist}=calcMACD(candles);
  macdLine.setData(macd); macdSig.setData(signal); macdHist.setData(hist);
}

/* =====================================================================
   Drawing tools
===================================================================== */
function setTool(name){
  activeTool = activeTool===name ? null : name;
  fibPt1=null; tlPt1=null;
  document.getElementById('fib-hint').style.display='none';
  ['hline','fib','tl'].forEach(t=>{
    document.getElementById('tool-'+t).classList.toggle('on',activeTool===t);
  });
  document.getElementById('main-chart').style.cursor = activeTool?'crosshair':'default';
}

function handleClick(time, price, point){
  if(activeTool==='hline'){
    const ln=candleSeries.createPriceLine({
      price, color:'#ffd600', lineWidth:1,
      lineStyle:LightweightCharts.LineStyle.Dashed,
      axisLabelVisible:true, title:fmt(price),
    });
    hLines.push(ln);
    setTool(null);
  } else if(activeTool==='fib'){
    if(!fibPt1){
      fibPt1=price;
      document.getElementById('fib-hint').style.display='inline';
    } else {
      drawFib(fibPt1,price);
      fibPt1=null;
      document.getElementById('fib-hint').style.display='none';
      setTool(null);
    }
  } else if(activeTool==='tl'){
    if(!tlPt1){
      tlPt1={time,price};
    } else {
      drawTrendLine(tlPt1,{time,price});
      tlPt1=null;
      setTool(null);
    }
  }
}

function drawFib(p1,p2){
  const hi=Math.max(p1,p2), lo=Math.min(p1,p2), rng=hi-lo;
  fibLines.forEach(l=>{try{candleSeries.removePriceLine(l);}catch(_){}});
  fibLines=[];
  const lvls=[
    [0,    '#ef5350'],
    [.236, '#ff9800'],
    [.382, '#ffd600'],
    [.5,   '#a5f3fc'],
    [.618, '#86efac'],
    [.786, '#c084fc'],
    [1,    '#ef5350'],
  ];
  lvls.forEach(([lv,color])=>{
    const pr=hi-rng*lv;
    fibLines.push(candleSeries.createPriceLine({
      price:pr, color, lineWidth:1,
      lineStyle:LightweightCharts.LineStyle.Dashed,
      axisLabelVisible:true, title:`${(lv*100).toFixed(1)}%`,
    }));
  });
}

function drawTrendLine(pt1, pt2){
  // Render as a line series with two anchor points extended slightly
  const s=mainChart.addLineSeries({color:'#ffd600',lineWidth:1,
    lineStyle:LightweightCharts.LineStyle.Solid,lastValueVisible:false,
    priceLineVisible:false});
  s.setData([{time:pt1.time,value:pt1.price},{time:pt2.time,value:pt2.price}]);
  tlSeries.push(s);
}

function clearDrawings(){
  hLines.forEach(l=>{try{candleSeries.removePriceLine(l);}catch(_){}});
  fibLines.forEach(l=>{try{candleSeries.removePriceLine(l);}catch(_){}});
  tlSeries.forEach(s=>{try{mainChart.removeSeries(s);}catch(_){}});
  hLines=[]; fibLines=[]; tlSeries=[];
  fibPt1=null; tlPt1=null;
  document.getElementById('fib-hint').style.display='none';
  setTool(null);
}

/* =====================================================================
   Browser-side localStorage cache (survives page refresh, saves API calls)
===================================================================== */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function lsGet(pair, tf){
  try{
    const raw=localStorage.getItem(`fx_${pair}_${tf}`);
    if(!raw) return null;
    const {ts,data}=JSON.parse(raw);
    if(Date.now()-ts>CACHE_TTL_MS){localStorage.removeItem(`fx_${pair}_${tf}`);return null;}
    return data;
  }catch(_){return null;}
}
function lsSet(pair, tf, data){
  try{localStorage.setItem(`fx_${pair}_${tf}`,JSON.stringify({ts:Date.now(),data}));}
  catch(_){}
}

/* =====================================================================
   Data loading
===================================================================== */
async function loadData(){
  document.getElementById('loading').style.display='flex';
  document.getElementById('error-bar').style.display='none';

  // 1. Try browser cache first
  const cached=lsGet(currentPair,currentTF);
  if(cached){
    candles=cached;
    candleSeries.setData(candles);
    updateIndicators();
    mainChart.timeScale().fitContent();
    if(candles.length){
      updateInfoBar(candles[candles.length-1]);
      checkAlerts(candles[candles.length-1].close);
      renderPortfolio();
      renderAlertLines();
      startAutoRefresh();
    }
    document.getElementById('loading').style.display='none';
    return;
  }

  // 2. Fetch from server
  try{
    const r=await fetch(`/api/candles?pair=${currentPair}&interval=${currentTF}`);
    if(!r.ok){
      const e=await r.json();
      if(r.status===429){
        showError('⏳ Limite Alpha Vantage atteinte (25 req/jour). '
          +'Données rechargées depuis le cache si disponible — réessayez demain '
          +'ou abonnez-vous sur alphavantage.co/premium');
      } else {
        showError(e.detail||'Erreur API');
      }
      document.getElementById('loading').style.display='none';
      return;
    }
    const d=await r.json();
    candles=d.candles;
    lsSet(currentPair,currentTF,candles); // save to browser cache
    candleSeries.setData(candles);
    updateIndicators();
    mainChart.timeScale().fitContent();
    if(candles.length){
      updateInfoBar(candles[candles.length-1]);
      checkAlerts(candles[candles.length-1].close);
      renderPortfolio();
      renderAlertLines();
      startAutoRefresh();
    }
  }catch(e){
    showError('⚠ '+e.message);
  }
  document.getElementById('loading').style.display='none';
}

function showError(msg){
  document.getElementById('error-bar').textContent=msg;
  document.getElementById('error-bar').style.display='block';
}

/* =====================================================================
   UI interactions
===================================================================== */
function fmt(p){
  const a=Math.abs(p);
  return a<10?p.toFixed(5):a<100?p.toFixed(3):p.toFixed(2);
}

function updateInfoBar(c){
  document.getElementById('ib-o').textContent='O '+fmt(c.open);
  document.getElementById('ib-h').textContent='H '+fmt(c.high);
  document.getElementById('ib-l').textContent='L '+fmt(c.low);
  document.getElementById('ib-c').textContent='C '+fmt(c.close);
  const chg=c.close-c.open, pct=c.open>0?(chg/c.open*100):0;
  const el=document.getElementById('info-chg');
  el.textContent=(chg>=0?'+':'')+fmt(chg)+' ('+(pct>=0?'+':'')+pct.toFixed(2)+'%)';
  el.style.color=chg>=0?'#26a69a':'#ef5350';
}

function selectPair(pair){
  currentPair=pair;
  document.getElementById('cur-pair').textContent=pair.slice(0,3)+'/'+pair.slice(3);
  document.querySelectorAll('.pair-item').forEach(b=>b.classList.toggle('on',b.dataset.pair===pair));
  clearDrawings(); loadData();
}

function setTF(btn){
  currentTF=btn.dataset.tf;
  document.querySelectorAll('.tf-btn').forEach(b=>b.classList.toggle('on',b===btn));
  loadData();
}

function filterPairs(q){
  const v=q.toUpperCase();
  document.querySelectorAll('.pair-item').forEach(el=>{
    el.style.display=el.dataset.pair.includes(v)?'':'none';
  });
}

function renderPairList(){
  const list=document.getElementById('pair-list');
  list.innerHTML='';
  PAIRS.forEach(p=>{
    const d=document.createElement('div');
    d.className='pair-item'+(p==='EURUSD'?' on':'');
    d.dataset.pair=p;
    d.textContent=p.slice(0,3)+'/'+p.slice(3);
    d.onclick=()=>selectPair(p);
    list.appendChild(d);
  });
}

/* ── Indicator toggles ── */
function toggleBB(){
  showBB=!showBB;
  bbUp.applyOptions({visible:showBB});
  bbMid.applyOptions({visible:showBB});
  bbLo.applyOptions({visible:showBB});
  document.getElementById('ind-bb').classList.toggle('on',showBB);
}
function toggleMA(n){
  const s={20:ma20s,50:ma50s,200:ma200s}[n];
  const id={20:'ind-ma20',50:'ind-ma50',200:'ind-ma200'}[n];
  const v=!s.options().visible;
  s.applyOptions({visible:v});
  document.getElementById(id).classList.toggle('on',v);
}
function toggleRSI(){
  showRSI=!showRSI;
  const el=document.getElementById('rsi-pane');
  el.style.display=showRSI?'block':'none';
  document.getElementById('ind-rsi').classList.toggle('on',showRSI);
  if(showRSI) setTimeout(()=>rsiChart.applyOptions(chartSize(el)),20);
}
function toggleMACD(){
  showMACD=!showMACD;
  const el=document.getElementById('macd-pane');
  el.style.display=showMACD?'block':'none';
  document.getElementById('ind-macd').classList.toggle('on',showMACD);
  if(showMACD) setTimeout(()=>macdChart.applyOptions(chartSize(el)),20);
}

/* ── AI Panel ── */
function toggleAI(){
  document.getElementById('ai-panel').classList.toggle('open');
}

function aiResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,100)+'px';
}
function aiKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiSend();}
}

function addAIMsg(role,text,streaming){
  const msgs=document.getElementById('ai-msgs');
  const d=document.createElement('div');
  d.className='ai-msg';
  d.innerHTML='<div class="ai-role">'+(role==='user'?'You':'Agent')+'</div>'
             +'<div class="ai-bubble'+(role==='user'?' user':'')+'">'
             +(streaming?'<div class="dots"><span></span><span></span><span></span></div>':
               (role==='user'?escHtml(text):marked.parse(text)))
             +'</div>';
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
  return d.querySelector('.ai-bubble');
}

function escHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function aiSend(){
  const input=document.getElementById('ai-input');
  const raw=input.value.trim();
  if(!raw||aiBusy) return;
  if(!sessionId) await initAISession();

  const ctx=`${raw}\n\n[Viewing: ${currentPair} ${currentTF}]`;
  input.value=''; input.style.height='auto';
  aiBusy=true;
  document.getElementById('ai-send').disabled=true;

  addAIMsg('user',raw);
  const bubble=addAIMsg('agent','',true);

  let text='';
  try{
    const resp=await fetch('/api/chat',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({session_id:sessionId,message:ctx}),
    });
    const reader=resp.body.getReader(),dec=new TextDecoder();
    let buf='',started=false;
    const msgs=document.getElementById('ai-msgs');
    while(true){
      const{done,value}=await reader.read();
      if(done) break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');
      buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        try{
          const ev=JSON.parse(line.slice(6));
          if(ev.type==='text'){
            if(!started){bubble.innerHTML='';started=true;}
            text+=ev.text;
            bubble.textContent=text;
            msgs.scrollTop=msgs.scrollHeight;
          } else if(ev.type==='done'){
            bubble.innerHTML=marked.parse(text);
            msgs.scrollTop=msgs.scrollHeight;
          } else if(ev.type==='error'){
            bubble.innerHTML='<span style="color:#ef5350">'+escHtml(ev.message)+'</span>';
          }
        }catch(_){}
      }
    }
  }catch(e){
    bubble.innerHTML='<span style="color:#ef5350">Connection error.</span>';
  }
  aiBusy=false;
  document.getElementById('ai-send').disabled=false;
  document.getElementById('ai-input').focus();
}

async function initAISession(){
  try{
    const r=await fetch('/api/session',{method:'POST'});
    const d=await r.json();
    sessionId=d.session_id||null;
  }catch(e){console.error('Session init failed:',e);}
}

/* =====================================================================
   Toast
===================================================================== */
function toast(msg){
  const t=document.createElement('div');
  t.className='toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),4000);
}

/* =====================================================================
   Auto-refresh
===================================================================== */
let rfTimer=null,rfCount=0;
const RF_SEC={'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'1D':86400};

function startAutoRefresh(){
  if(rfTimer) clearInterval(rfTimer);
  rfCount=RF_SEC[currentTF]||300;
  updRF();
  rfTimer=setInterval(()=>{
    rfCount--;updRF();
    if(rfCount<=0){
      localStorage.removeItem(`fx_${currentPair}_${currentTF}`);
      loadData();
    }
  },1000);
}

function updRF(){
  const m=Math.floor(rfCount/60),s=rfCount%60;
  document.getElementById('refresh-cd').textContent=
    '⟳ '+m+':'+(s<10?'0':'')+s;
}

/* =====================================================================
   Price Alerts
===================================================================== */
let priceAlerts=JSON.parse(localStorage.getItem('fx_alerts')||'[]');
let alertLines=[];

function saveAlerts(){
  localStorage.setItem('fx_alerts',JSON.stringify(priceAlerts));
}

function showAlertDialog(){
  const last=candles.length?candles[candles.length-1].close:0;
  const pp=currentPair.slice(0,3)+'/'+currentPair.slice(3);
  const val=prompt('🔔 Alerte '+pp+
    '\nPrix actuel: '+fmt(last)+'\nPrix cible:',fmt(last));
  if(!val) return;
  const p=parseFloat(val);if(isNaN(p)) return;
  const dir=p>=last?'above':'below';
  priceAlerts.push({
    id:Date.now(),pair:currentPair,price:p,direction:dir,active:true
  });
  saveAlerts();renderAlertLines();
  toast('🔔 Alerte: '+pp+' '+(dir==='above'?'≥':'≤')+' '+fmt(p));
}

function renderAlertLines(){
  alertLines.forEach(l=>{try{candleSeries.removePriceLine(l);}catch(_){}});
  alertLines=[];
  priceAlerts.filter(a=>a.pair===currentPair&&a.active).forEach(a=>{
    alertLines.push(candleSeries.createPriceLine({
      price:a.price,color:'#ffd600',lineWidth:1,
      lineStyle:LightweightCharts.LineStyle.LargeDashed,
      axisLabelVisible:true,title:'🔔 '+fmt(a.price),
    }));
  });
}

function checkAlerts(price){
  let changed=false;
  priceAlerts.forEach(a=>{
    if(!a.active||a.pair!==currentPair) return;
    const hit=(a.direction==='above'&&price>=a.price)||
              (a.direction==='below'&&price<=a.price);
    if(!hit) return;
    a.active=false;changed=true;
    const pp=a.pair.slice(0,3)+'/'+a.pair.slice(3);
    const sym=a.direction==='above'?'≥':'≤';
    const msg='🔔 '+pp+' '+sym+' '+fmt(a.price)+' — Actuel: '+fmt(price);
    toast(msg);
    if(typeof Notification!=='undefined'&&Notification.permission==='granted')
      new Notification('ForexAI',{body:msg});
  });
  if(changed){saveAlerts();renderAlertLines();}
}

async function requestNotif(){
  if(typeof Notification!=='undefined'&&Notification.permission==='default')
    await Notification.requestPermission();
}

/* =====================================================================
   Paper Trading Portfolio
===================================================================== */
let port=JSON.parse(localStorage.getItem('fx_port')||
  '{"balance":10000,"positions":[],"history":[]}');

function savePort(){
  localStorage.setItem('fx_port',JSON.stringify(port));
}

function togglePortfolio(){
  const el=document.getElementById('portfolio-pane');
  const open=el.style.display==='none'||!el.style.display;
  el.style.display=open?'block':'none';
  document.getElementById('btn-port').classList.toggle('on',open);
  if(open) renderPortfolio();
}

function openPos(dir){
  const last=candles.length?candles[candles.length-1].close:null;
  if(!last){toast('⚠ Chargez d\'abord le graphique');return;}
  const sz=parseFloat(document.getElementById('trade-sz').value)||1000;
  if(sz>port.balance){toast('⚠ Solde insuffisant');return;}
  port.balance-=sz;
  port.positions.push({
    id:Date.now(),pair:currentPair,direction:dir,
    entryPrice:last,size:sz,openTime:Date.now(),
  });
  savePort();renderPortfolio();
  const pp=currentPair.slice(0,3)+'/'+currentPair.slice(3);
  toast((dir==='long'?'▲ Long':'▼ Short')+' — '+pp+' @ '+fmt(last));
}

function closePos(id){
  const last=candles.length?candles[candles.length-1].close:null;
  if(!last) return;
  const i=port.positions.findIndex(p=>p.id===id);
  if(i<0) return;
  const p=port.positions[i];
  const pnl=posPnL(p,last);
  port.balance+=p.size+pnl;
  port.history.unshift({...p,closePrice:last,pnl,closeTime:Date.now()});
  port.positions.splice(i,1);
  savePort();renderPortfolio();
  toast('Fermé — P&L: '+(pnl>=0?'+':'')+'$'+pnl.toFixed(2));
}

function posPnL(p,cur){
  return((cur-p.entryPrice)/p.entryPrice)*p.size*(p.direction==='long'?1:-1);
}

function renderPortfolio(){
  const last=candles.length?candles[candles.length-1].close:null;
  document.getElementById('bal-disp').textContent=
    '$'+port.balance.toFixed(2);
  const totalPnL=port.positions.reduce(
    (s,p)=>s+(last?posPnL(p,last):0),0
  );
  const pe=document.getElementById('pnl-total');
  pe.textContent='P&L: '+(totalPnL>=0?'+':'')+'$'+totalPnL.toFixed(2);
  pe.style.color=totalPnL>=0?'#26a69a':'#ef5350';
  const tbody=document.getElementById('port-body');
  if(!port.positions.length){
    tbody.innerHTML=
      '<tr><td colspan="7" class="port-empty">'+
      'Aucune position ouverte.</td></tr>';
    return;
  }
  tbody.innerHTML=port.positions.map(p=>{
    const pnl=last?posPnL(p,last):0;
    const pr=pnl>=0?'#26a69a':'#ef5350';
    const pp=p.pair.slice(0,3)+'/'+p.pair.slice(3);
    const dclr=p.direction==='long'?'#26a69a':'#ef5350';
    const dlbl=p.direction==='long'?'&#x25B2; Long':'&#x25BC; Short';
    return '<tr><td>'+pp+'</td>'+
      '<td style="color:'+dclr+'">'+dlbl+'</td>'+
      '<td>$'+p.size.toLocaleString()+'</td>'+
      '<td>'+fmt(p.entryPrice)+'</td>'+
      '<td>'+(last?fmt(last):'—')+'</td>'+
      '<td style="color:'+pr+';font-weight:600">'+
      (pnl>=0?'+':'')+'$'+pnl.toFixed(2)+'</td>'+
      '<td><button class="btn-close-pos" onclick="closePos('+p.id+
      ')">&#x2715;</button></td></tr>';
  }).join('');
}

function resetPort(){
  if(!confirm('Réinitialiser le portfolio à $10,000 ?')) return;
  port={balance:10000,positions:[],history:[]};
  savePort();renderPortfolio();
  toast('Portfolio réinitialisé: $10,000');
}

/* =====================================================================
   Bootstrap
===================================================================== */
window.addEventListener('load',async ()=>{
  // Load pair list
  try{
    const r=await fetch('/api/pairs');
    const d=await r.json();
    PAIRS=d.pairs;
  }catch(_){
    PAIRS=['EURUSD','USDJPY','GBPUSD','USDCHF','USDCAD','AUDUSD'];
  }
  renderPairList();

  // Init charts
  initMainChart();
  initRSI();
  initMACD();
  syncTimeScales();

  // Add RSI price lines after init
  rsiSeries.createPriceLine({price:70,color:'#ef5350',lineWidth:1,
    lineStyle:LightweightCharts.LineStyle.Dashed,axisLabelVisible:true,title:'OB'});
  rsiSeries.createPriceLine({price:30,color:'#26a69a',lineWidth:1,
    lineStyle:LightweightCharts.LineStyle.Dashed,axisLabelVisible:true,title:'OS'});

  // Load initial data
  await loadData();

  // Init AI session in background
  initAISession();
});
</script>
</body>
</html>"""
