/* Kill Switch: desktop mode (the 2017-style analyst workstation).
 * Optional. Load it after engine.js on levels that play on a fake PC.
 * Gives the level desktop icons, draggable windows, a taskbar and an in-game clock.
 *
 * Use:
 *   const { openApp, gameClock } = KS.desktop;
 *   KS.engine.run({ ..., mode: KS.desktop.mode({
 *     label: 'MT-WS',                                              // optional: name shown at the left of the taskbar
 *     clock: { start: [14, 47], speed: 6, date: '12/05/2017' },   // speed = in-game seconds per real second
 *     icons: [['mail', 'Mail'], ...],                            // desktop order; icon art from KS.desktop.ICON
 *     apps:  { mail: { title, w, h, dark?, mount(bodyEl), unmount?() }, ... },
 *   }) });
 *
 * Anything else on the desktop (sticky note, wallpaper mark) goes in the level's
 * index.html inside <div id="stage"><div id="desktop"> ... </div></div>.
 * See docs/02-design/component-inventory.md for the parts of this kit.
 */
(function () {
  'use strict';
  const { $, $$, esc } = window.KS;

  const ICON = {
    mail: '<svg viewBox="0 0 40 40"><rect x="3" y="8" width="34" height="24" rx="3" fill="#3f86e8"/><path d="M4 10l16 12 16-12" fill="none" stroke="#fff" stroke-width="2.4"/></svg>',
    samples: '<svg viewBox="0 0 40 40"><path d="M3 10a2 2 0 012-2h10l4 4h16a2 2 0 012 2v18a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#f2b33d"/><rect x="3" y="15" width="34" height="19" rx="2" fill="#f7c95c"/><circle cx="20" cy="24.5" r="5" fill="#c0392b"/><path d="M20 21.5v3.5M20 26.8v.2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    sandbox: '<svg viewBox="0 0 40 40"><rect x="3" y="6" width="34" height="24" rx="3" fill="#1d6b4c"/><rect x="6" y="9" width="28" height="18" rx="1" fill="#0d3b29"/><path d="M20 11l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8v-5z" fill="#37d39a"/><rect x="14" y="32" width="12" height="3" rx="1" fill="#9fb0cc"/></svg>',
    disasm: '<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="3" fill="#5b3fb5"/><text x="20" y="25" text-anchor="middle" font-family="monospace" font-weight="700" font-size="13" fill="#fff">0x4F</text></svg>',
    terminal: '<svg viewBox="0 0 40 40"><rect x="3" y="6" width="34" height="28" rx="3" fill="#0b0f16" stroke="#5b6b85"/><path d="M9 15l6 5-6 5" fill="none" stroke="#37d39a" stroke-width="2.6"/><path d="M18 26h11" stroke="#37d39a" stroke-width="2.6"/></svg>',
    browser: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#2b7fe0"/><path d="M5 20h30M20 5c-6 7-6 23 0 30M20 5c6 7 6 23 0 30M8 12h24M8 28h24" fill="none" stroke="#cfe3ff" stroke-width="1.6"/></svg>',
    monitor: '<svg viewBox="0 0 40 40"><rect x="3" y="6" width="34" height="26" rx="3" fill="#121b2b" stroke="#5b6b85"/><path d="M7 26l6-6 5 3 6-9 5 4 4-6" fill="none" stroke="#ff5446" stroke-width="2.4"/><rect x="15" y="33" width="10" height="3" rx="1" fill="#9fb0cc"/></svg>',
    bin: '<svg viewBox="0 0 40 40"><path d="M10 12h20l-2 23H12z" fill="#a9b6c9"/><rect x="8" y="8" width="24" height="4" rx="1" fill="#d5dde8"/><rect x="16" y="5" width="8" height="3" rx="1" fill="#d5dde8"/><path d="M16 16v15M20 16v15M24 16v15" stroke="#7d8ba1" stroke-width="1.6"/></svg>',
    exe: '<svg viewBox="0 0 40 40"><path d="M9 3h16l7 7v27H9z" fill="#fff" stroke="#9aa6b8"/><path d="M25 3v7h7" fill="#e5e9f0" stroke="#9aa6b8"/><rect x="11" y="20" width="19" height="10" rx="2" fill="#c0392b"/><text x="20.5" y="27.6" text-anchor="middle" font-family="monospace" font-weight="700" font-size="7.5" fill="#fff">EXE</text></svg>',
    txt: '<svg viewBox="0 0 40 40"><path d="M9 3h16l7 7v27H9z" fill="#fff" stroke="#9aa6b8"/><path d="M25 3v7h7" fill="#e5e9f0" stroke="#9aa6b8"/><path d="M13 16h15M13 20h15M13 24h15M13 28h10" stroke="#9aa6b8" stroke-width="1.6"/></svg>',
    doc: '<svg viewBox="0 0 40 40"><path d="M9 3h16l7 7v27H9z" fill="#fff" stroke="#9aa6b8"/><path d="M25 3v7h7" fill="#e5e9f0" stroke="#9aa6b8"/><rect x="11" y="20" width="19" height="10" rx="2" fill="#2b579a"/><text x="20.5" y="27.6" text-anchor="middle" font-family="monospace" font-weight="700" font-size="7.5" fill="#fff">DOC</text></svg>',
    macro: '<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="3" fill="#5b3fb5"/><text x="20" y="25" text-anchor="middle" font-family="monospace" font-weight="700" font-size="13" fill="#fff">VBA</text></svg>',
    map: '<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="3" fill="#121b2b" stroke="#5b6b85"/><path d="M10 20L20 12M10 20L20 28M20 12L30 20M20 28L30 20" stroke="#7cb4ff" stroke-width="1.6"/><circle cx="10" cy="20" r="3.2" fill="#ff5446"/><circle cx="20" cy="12" r="3.2" fill="#ffb23f"/><circle cx="20" cy="28" r="3.2" fill="#ffb23f"/><circle cx="30" cy="20" r="3.2" fill="#37d39a"/></svg>',
    update: '<svg viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="10" rx="2" fill="#26354f" stroke="#5b6b85"/><rect x="5" y="18" width="30" height="10" rx="2" fill="#26354f" stroke="#5b6b85"/><circle cx="10" cy="10" r="1.8" fill="#37d39a"/><circle cx="10" cy="23" r="1.8" fill="#37d39a"/><path d="M20 30v7M16.5 34l3.5 3.5 3.5-3.5" fill="none" stroke="#37d39a" stroke-width="2.2"/></svg>',
  };

  let C = null;      // desktop config: clock, icons, apps
  let D = null;      // the #desktop element
  const wins = {};   // open windows by app id
  let zTop = 100, cascade = 0;

  /* ---------- in-game clock ---------- */
  function gameClock(withSeconds) {
    const [h0, m0] = C.clock.start;
    const t = h0 * 3600 + m0 * 60 + Math.floor(window.KS.game.elapsed() * (C.clock.speed || 6));
    const h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + (withSeconds ? ':' + String(s).padStart(2, '0') : '');
  }

  /* ---------- window manager ---------- */
  function openApp(id) {
    if (wins[id]) { focusWin(id); return; }
    const A = C.apps[id];
    const w = document.createElement('section'); w.className = 'win'; w.setAttribute('aria-label', A.title);
    w.innerHTML = `<div class="titlebar"><span class="t">${esc(A.title)}</span><button aria-label="Close ${esc(A.title)}" data-close>×</button></div><div class="body ${A.dark ? 'dark' : ''}"></div>`;
    const dw = D.clientWidth, dh = D.clientHeight - 44;
    const W = Math.min(A.w, dw - 16), H = Math.min(A.h, dh - 16);
    const k = cascade++ % 6;
    const x = Math.max(8, Math.min(dw - W - 8, (dw < 700 ? 8 : 130) + k * 26)), y = Math.max(8, Math.min(dh - H - 8, 54 + k * 24));
    Object.assign(w.style, { left: x + 'px', top: y + 'px', width: W + 'px', height: H + 'px' });
    D.appendChild(w); wins[id] = w;
    const t = document.createElement('button'); t.className = 'task'; t.textContent = A.title; t.onclick = () => focusWin(id); $('#tasks').appendChild(t); w._task = t;
    w.addEventListener('pointerdown', () => focusWin(id));
    w.querySelector('[data-close]').onclick = e => { e.stopPropagation(); closeWin(id); };
    drag(w, w.querySelector('.titlebar'));
    A.mount(w.querySelector('.body'));
    focusWin(id);
  }
  function focusWin(id) {
    Object.entries(wins).forEach(([k, w]) => { w.classList.toggle('focused', k === id); w._task.classList.toggle('active', k === id); });
    if (wins[id]) wins[id].style.zIndex = ++zTop;
  }
  function closeWin(id) {
    const w = wins[id]; if (!w) return;
    C.apps[id].unmount && C.apps[id].unmount();
    w._task.remove(); w.remove(); delete wins[id];
  }
  function drag(w, h) {
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const rc = w.getBoundingClientRect(), R = D.getBoundingClientRect();
      const ox = e.clientX - rc.left, oy = e.clientY - rc.top;
      h.setPointerCapture(e.pointerId);
      const mv = ev => {
        let x = ev.clientX - R.left - ox, y = ev.clientY - R.top - oy;
        x = Math.max(-rc.width + 90, Math.min(R.width - 90, x)); y = Math.max(0, Math.min(R.height - 90, y));
        w.style.left = x + 'px'; w.style.top = y + 'px';
      };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
  }

  /* ---------- the mode the engine runs ---------- */
  function mode(config) {
    C = config;
    return {
      setup(stage) {
        D = $('#desktop', stage);
        if (!D) { D = document.createElement('div'); D.id = 'desktop'; stage.appendChild(D); }
        D.insertAdjacentHTML('beforeend', `
          <nav class="icons" id="icons" aria-label="Desktop"></nav>
          <div class="taskbar"><span class="start">${esc(C.label || 'MT-WS')}</span><div class="tasks" id="tasks"></div><div class="clock" id="clock"></div></div>`);
        $('#icons').innerHTML = C.icons.map(([id, label]) => `<button class="icon" data-app="${id}">${ICON[id] || ''}<span>${esc(label)}</span></button>`).join('');
        $$('#icons [data-app]').forEach(b => b.onclick = () => openApp(b.dataset.app));
      },
      onStart() { cascade = 0; },
      onTick() { $('#clock').innerHTML = gameClock() + '<br>' + esc(C.clock.date); },
      onStop() { Object.keys(wins).forEach(closeWin); },
      onWin(G) { G.winClock = gameClock(); },
    };
  }

  window.KS.desktop = { mode, openApp, focusWin, closeWin, gameClock, ICON };
})();
