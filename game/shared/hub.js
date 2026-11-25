/* Kill Switch: level hub (game/index.html). Needs core.js. */
(function () {
  'use strict';
  const { $, fmt, kw, progress, save, reset, LEVELS } = window.KS;

  function renderHub() {
    $('#levels').innerHTML = LEVELS.map(L => {
      const solved = progress.solved[L.id], open = progress.unlocked[L.id];
      const st = !L.playable ? 'dev' : solved ? 'solved' : open ? 'open' : 'locked';
      const label = { dev: 'In development', solved: 'Solved', open: 'Unlocked', locked: 'Locked' }[st];
      let act = '';
      if (st === 'dev') act = '<p class="fine" style="margin-top:auto">Coming soon.</p>';
      else if (st === 'locked') act = `<form class="unlock" data-id="${L.id}"><label class="sr" for="kw${L.id}">Keyword for level ${L.id}</label><input id="kw${L.id}" autocomplete="off" spellcheck="false" placeholder="Keyword"><button class="btn">Unlock</button></form><div class="msg" id="msg${L.id}"></div>`;
      else act = `<div class="unlock"><a class="btn ${solved ? 'ghost' : ''}" href="${L.path}" data-play="${L.id}">${solved ? 'Play again' : 'Start case'}</a>${solved ? `<span class="solvedinfo">Best ${fmt(solved.time)} · ${solved.hints} hint${solved.hints === 1 ? '' : 's'}</span>` : ''}</div>`;
      return `<article class="card ${st}"><div class="card-top"><span class="lvl">LEVEL ${String(L.id).padStart(2, '0')}</span><span class="pill ${st}">${label}</span></div><div class="type">${L.type}</div><h3>${L.name}<small>${L.year}</small></h3><p>${L.teaser}</p>${act}</article>`;
    }).join('');
  }

  $('#levels').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, id = +f.dataset.id, L = LEVELS.find(l => l.id === id), inp = f.querySelector('input');
    if (kw(inp.value) === L.hash) {
      progress.unlocked[id] = true; save(); renderHub();
      const b = $(`[data-play="${id}"]`); b && b.focus();
    } else {
      $('#msg' + id).textContent = inp.value.trim() ? 'That\'s not it. Listen for the keyword at the end of the mini-lecture.' : 'Type the keyword first.';
      inp.select();
    }
  });
  $('#resetBtn').onclick = () => { reset(); renderHub(); };

  renderHub();
})();
