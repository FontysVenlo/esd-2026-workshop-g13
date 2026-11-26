/* Kill Switch: level engine (the frame every level shares).
 *
 * The engine runs one level page: keyword gate -> briefing -> play -> win -> debrief.
 * It owns the HUD (objective, timer, hints, messages, exit), toasts, dialogs, overlays,
 * time penalties, saving the best time, and the debrief with its quiz.
 * What happens during play is up to the level: either a ready-made mode
 * (e.g. KS.desktop, the analyst desktop in modes/desktop.js) or its own minigame.
 *
 * A level page needs #briefing (with #bootBtn), #play and #debrief (with #dbTitle,
 * #dbStats, #quiz), loads core.js + engine.js (+ a mode) + its level.js, and calls:
 *
 * KS.engine.run({
 *   id,                 key in saved progress (matches KS.LEVELS for real levels)
 *   objective,          text in the HUD
 *   hints: [html x3],   nudge, direction, answer
 *   mode,               optional, e.g. KS.desktop.mode({...}); drawn inside the stage
 *   newState(),         optional: this level's own state, merged into G for each attempt
 *   setup(stage, api),  optional: build your minigame's DOM once, inside `stage`
 *   onStart(G),         optional: a new attempt starts (reset your minigame here)
 *   onTick(G),          optional: every second while playing
 *   onStop(G),          optional: attempt ends (cleanup)
 *   win: { label(G), html },             the box shown when the player wins
 *   debrief: { title(G), stats(G), quiz },   stats -> [[label, value], ...]
 * });
 *
 * While playing, levels use KS.game: win(), penalty(seconds), toast(), dialog(),
 * overlay(), later(), elapsed(), and KS.game.G (this attempt's state).
 */
(function () {
  'use strict';
  const { $, $$, esc, fmt, progress, markSolved } = window.KS;

  const HUB = '../../index.html';
  let L = null;   // level definition
  let M = {};     // its mode, if any
  let G = null;   // state of the current attempt
  let stage = null;

  /* ---------- screens ---------- */
  function show(id) {
    ['briefing', 'play', 'debrief'].forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }
  function toHub() { teardown(); location.href = HUB; }

  /* ---------- time ---------- */
  const elapsed = () => G.endEl != null ? G.endEl : (Date.now() - G.start) / 1000 + G.penalty;
  // Run fn after ms, unless the attempt ended in the meantime.
  const later = (ms, fn) => { G.timers.push(setTimeout(() => { if (G && !G.dead) fn(); }, ms)); };
  function penalty(seconds) { G.penalty += seconds; $('#timer').textContent = fmt(elapsed()); }

  /* ---------- frame: stage, HUD, toasts ---------- */
  function buildFrame() {
    const P = $('#play');
    stage = $('#stage', P);
    if (!stage) { stage = document.createElement('div'); stage.id = 'stage'; P.prepend(stage); }
    P.insertAdjacentHTML('beforeend', `
      <div class="hud">
        <span class="mission"><b>OBJECTIVE</b>${esc(L.objective)}</span>
        <span class="timer" id="timer" aria-label="Time elapsed">00:00</span>
        <button class="btn" id="hintBtn">Hint 0/${L.hints.length}</button>
        <button class="btn ghost" id="logBtn" style="color:var(--text)" title="Read messages and hints again">Messages 0</button>
        <button class="btn ghost" id="exitLvl" style="color:var(--text)">Exit</button>
      </div>
      <div class="toasts" id="toasts" aria-live="polite"></div>`);
    $('#hintBtn').onclick = () => {
      if (!G) return;
      const fresh = G.hints < L.hints.length;
      if (fresh) G.hints++;
      updateHint();
      // once all hints are out the button only shows the last one again
      // so it replaces the hint on screen and isn't logged a second time
      $$('#toasts .toast.hint').forEach(t => t.remove());
      toast('Hint ' + G.hints, L.hints[G.hints - 1], 'hint', null, 22000, !fresh);
    };
    $('#logBtn').onclick = () => { if (G) showLog(); };
    $('#exitLvl').onclick = () => {
      if (!G) return;
      dialog('Leave this case?', '<p>Your progress in this level will be lost.</p>', [{ label: 'Leave', cls: 'danger', fn: toHub }, { label: 'Keep playing', cls: 'ghost' }]);
    };
  }
  function updateHint() { $('#hintBtn').textContent = `Hint ${G.hints}/${L.hints.length}`; }
  function updateLog() { $('#logBtn').textContent = 'Messages ' + G.log.length; }

  /* ---------- attempt lifecycle ---------- */
  function start() {
    teardown();
    G = Object.assign(
      { start: Date.now(), penalty: 0, hints: 0, won: false, endEl: null, dead: false, timers: [], iv: null, log: [] },
      M.newState ? M.newState() : {},
      L.newState ? L.newState() : {});
    show('play');
    updateHint();
    updateLog();
    M.onStart && M.onStart(G);
    L.onStart && L.onStart(G);
    tick(); G.iv = setInterval(tick, 1000);
  }
  function teardown() {
    if (!G) return;
    G.dead = true; clearInterval(G.iv); G.timers.forEach(clearTimeout);
    L.onStop && L.onStop(G);
    M.onStop && M.onStop(G);
    $$('#play > .overlay').forEach(o => o.remove());
    $('#toasts').innerHTML = '';
  }
  function tick() {
    if (!G || G.dead) return;
    $('#timer').textContent = fmt(elapsed());
    M.onTick && M.onTick(G);
    L.onTick && L.onTick(G);
  }

  /* ---------- toasts, dialogs, overlays ---------- */
  // text may contain trusted HTML from the level itself.
  function toast(from, text, cls, onClick, ms, repeat) {
    if (!repeat) { G.log.push({ from, text, cls: cls || '', at: elapsed() }); updateLog(); }
    const t = document.createElement('div'); t.className = 'toast ' + (cls || '');
    t.innerHTML = `<b>${esc(from)}</b>${text}`;
    t.onclick = () => { if (onClick) onClick(); t.remove(); };
    $('#toasts').appendChild(t);
    const all = $$('#toasts .toast'); if (all.length > 3) all[0].remove();
    G.timers.push(setTimeout(() => t.remove(), ms || 9000));
  }
  // shows every message and hint of this attempt again, newest first
  // toasts fade after a few seconds, so this is the only way to re-read them
  function showLog() {
    if ($('#play > .overlay .msglog')) return;
    const items = G.log.slice().reverse().map(m => `<li class="${m.cls}"><b>${esc(m.from)}<span>${fmt(m.at)}</span></b>${m.text}</li>`).join('');
    const o = overlay(`<div class="msglog" role="dialog" aria-label="Messages"><div class="titlebar"><span class="t">Messages</span><button aria-label="Close messages" data-close>×</button></div>${items ? `<ul>${items}</ul>` : '<p class="fine">No messages yet.</p>'}</div>`);
    const x = o.querySelector('[data-close]');
    x.onclick = () => o.remove();
    o.onclick = e => { if (e.target === o) o.remove(); };
    o.onkeydown = e => { if (e.key === 'Escape') o.remove(); };
    x.focus();
  }
  // Full-screen takeover above the stage and HUD (trap screens, win box). Removed on teardown.
  function overlay(html) {
    const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html;
    $('#play').appendChild(o);
    return o;
  }
  function dialog(title, html, buttons) {
    const o = overlay(`<div class="dialog" role="alertdialog" aria-label="${esc(title)}"><div class="titlebar"><span class="t">${esc(title)}</span></div><div class="dbody">${html}<div class="row"></div></div></div>`);
    const row = o.querySelector('.row');
    buttons.forEach(bt => {
      const x = document.createElement('button'); x.className = 'btn ' + (bt.cls || ''); x.textContent = bt.label;
      x.onclick = () => { o.remove(); bt.fn && bt.fn(); };
      row.appendChild(x);
    });
    row.lastChild.focus();
    return o;
  }

  /* ---------- win + debrief ---------- */
  function win() {
    if (!G || G.won) return;
    G.won = true; G.endEl = (Date.now() - G.start) / 1000 + G.penalty;
    markSolved(L.id, G.endEl, G.hints);
    M.onWin && M.onWin(G);
    L.onWin && L.onWin(G);
    tick();
    later(1400, () => {
      const label = typeof L.win.label === 'function' ? L.win.label(G) : (L.win.label || 'Case solved');
      const o = overlay(`<div class="winbox" role="alertdialog" aria-label="Case solved"><div class="eyebrow">${esc(label)}</div>${L.win.html}<button class="btn ok">Read the debrief</button></div>`);
      const b = o.querySelector('button'); b.onclick = showDebrief; b.focus();
    });
  }
  function showDebrief() {
    const done = G;
    teardown(); show('debrief'); $('#debrief').scrollTop = 0;
    $('#dbTitle').textContent = L.debrief.title(done);
    $('#dbStats').innerHTML = L.debrief.stats(done).map(([k, v]) => `<div class="stat"><small>${esc(k)}</small><div class="v">${esc(v)}</div></div>`).join('');
    const Q = L.debrief.quiz || [];
    $('#quiz').innerHTML = Q.map((x, i) => `<div class="q" data-q="${i}"><b>${i + 1}. ${esc(x.q)}</b><div class="opts">${x.o.map((o, j) => `<button class="opt" data-o="${j}">${esc(o)}</button>`).join('')}</div><p class="why hidden"></p></div>`).join('');
    $$('#quiz .q').forEach(q => {
      const x = Q[+q.dataset.q];
      $$('.opt', q).forEach(btn => btn.onclick = () => {
        const j = +btn.dataset.o;
        $$('.opt', q).forEach((b2, k) => { b2.disabled = true; if (k === x.a) b2.classList.add('right'); });
        if (j !== x.a) btn.classList.add('wrong');
        const w = q.querySelector('.why');
        w.textContent = (j === x.a ? 'Correct. ' : 'Not quite. ') + x.why;
        w.classList.remove('hidden');
      });
    });
  }

  /* ---------- the API levels and modes use while playing ---------- */
  const api = { toast, dialog, overlay, later, elapsed, penalty, win, get G() { return G; }, get stage() { return stage; } };

  /* ---------- start a level page ---------- */
  function run(level) {
    L = level; M = level.mode || {};
    // The keyword gate lives on the hub. Facilitators can skip it with ?dev in the URL.
    const dev = new URLSearchParams(location.search).has('dev');
    if (!progress.unlocked[L.id] && !dev) { location.replace(HUB); return; }
    buildFrame();
    M.setup && M.setup(stage, api);
    L.setup && L.setup(stage, api);
    $$('[data-exit]').forEach(b => b.onclick = toHub);
    $('#bootBtn').onclick = start;
    show('briefing'); $('#bootBtn').focus();
  }

  window.KS.engine = { run };
  window.KS.game = api;
})();
