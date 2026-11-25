/* Kill Switch: shared core.
 * Small helpers, saved progress and the list of levels.
 * Loaded by the hub and by every level page.
 */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rand = n => Math.floor(Math.random() * n);
  const fmt = s => {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  // Keywords are stored hashed (FNV-1a) so they don't show up in the page source.
  // Case, spaces and punctuation are ignored. To make a hash for a new keyword,
  // open the browser console on the hub and run: KS.kw('YOURKEYWORD')
  function kw(s) {
    let x = 0x811c9dc5;
    for (const ch of String(s).toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      x ^= ch.charCodeAt(0);
      x = Math.imul(x, 0x01000193) >>> 0;
    }
    return x.toString(16);
  }

  /* ---------- progress (per browser) ---------- */
  const STORE = 'killswitch-workshop-v1';
  function loadProgress() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { p = {}; }
    p.unlocked = p.unlocked || {};
    p.solved = p.solved || {};
    return p;
  }
  const progress = loadProgress();
  function save() { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch (e) { /* private mode */ } }
  function reset() { progress.unlocked = {}; progress.solved = {}; save(); }
  function markSolved(id, time, hints) {
    const prev = progress.solved[id];
    if (!prev || time < prev.time) progress.solved[id] = { time: Math.floor(time), hints };
    progress.unlocked[id] = true;
    save();
  }

  /* ---------- levels ----------
   * hash  = KS.kw(keyword). Leave it out while a level is in development.
   * path  = the level's page, relative to game/index.html.
   */
  const LEVELS = [
    { id: 1, type: 'Ransomware', name: 'WannaCry', year: 2017, teaser: 'Hospitals are turning patients away. A live sample just landed in your inbox.', hash: 'c7fa392', path: 'levels/01-ransomware/index.html', playable: true },
    { id: 2, type: 'Trojan & botnet', name: 'Emotet', year: 2021, teaser: 'Police have seized the botnet\'s servers. You write the last update every infected PC will ever get.', playable: false },
    { id: 3, type: 'Spyware', name: 'Pegasus', year: 2016, teaser: 'A human rights activist forwards you two strange text messages with links in them.', playable: false },
    { id: 4, type: 'Rootkit', name: 'Sony BMG', year: 2005, teaser: 'A music CD installed something on your PC that the operating system can\'t see.', playable: false },
    { id: 5, type: 'Backdoor', name: 'xz utils', year: 2024, teaser: 'SSH logins got half a second slower. Nobody else noticed.', playable: false },
  ];

  window.KS = { $, $$, esc, rand, fmt, kw, progress, save, reset, markSolved, LEVELS };
})();
