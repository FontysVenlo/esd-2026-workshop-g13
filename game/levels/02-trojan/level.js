/* level 02: emotet (trojan / botnet), content and puzzle logic only
 * the frame (hud, hints, messages, win, debrief) comes from shared/engine.js
 * the desktop (icons, windows, taskbar, in-game clock) from shared/modes/desktop.js
 *
 * win path: read the forwarded email -> run the attachment in the sandbox vm, which gives
 * a bot the police control -> in the terminal find its process (ps) and read the server
 * list from its memory (dump) -> on the botnet map send a police team to every relay, timed
 * so that all of them are at the door at the same moment -> strike -> do the same for the
 * backend servers before the operators wipe them -> fill in the code of the last update:
 * police servers, notify owners, leave other malware alone, tm_mon 3 and tm_mday 25
 * (25 April 2021, months count from 0)
 * the map runs in real time: teams need different times, can only wait a few seconds, and
 * the operators replace a relay every so often
 * traps: "enable content" on the workstation (+2:00), a strike with a team missing or a
 * wrong update (+1:00 each), losing the backend (the operation starts over)
 */
(function () {
  'use strict';
  const { $$, esc, rand, fmt } = window.KS;
  const { toast, dialog, later, win, penalty } = window.KS.game;
  const { openApp, gameClock } = window.KS.desktop;

  // this attempt's state, set in onStart
  let G = null;
  let loop = null;

  /* ---------- the simulated botnet ---------- */
  // country -> [name, seconds its police team needs to reach a server]
  const TEAMS = { NL: ['Netherlands', 6], DE: ['Germany', 9], FR: ['France', 11], GB: ['United Kingdom', 13], LT: ['Lithuania', 15], CA: ['Canada', 18], US: ['United States', 21], UA: ['Ukraine', 24] };
  // seconds a team can wait at the door, seconds between the operators' list updates,
  // seconds until the operators have wiped the backend, number of relays
  const HOLD = 8, ROTATE = 75, WIPE = 45, RELAYS = 6;

  const shuffle = list => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const num = n => Math.round(n).toLocaleString('en-GB');
  const secs = ms => Math.max(0, Math.ceil(ms / 1000));
  const seized = () => G.phase === 'seized' || G.phase === 'done';
  const need = n => TEAMS[n.cc][1];

  // addresses come from the ranges reserved for documentation, so none of them is a real server
  function freshIp(port) {
    let ip;
    do { ip = `${['192.0.2', '198.51.100', '203.0.113'][rand(3)]}.${2 + rand(250)}`; } while (G.used[ip]);
    G.used[ip] = true;
    return port ? `${ip}:${[80, 443, 7080, 8080][rand(4)]}` : ip;
  }
  const newRelay = cc => ({ ip: freshIp(true), cc, be: rand(3), st: 'idle', t0: 0, t1: 0, note: '' });
  function newRelays() {
    G.relays = shuffle(Object.keys(TEAMS)).slice(0, RELAYS).map(newRelay);
    G.rotAt = Date.now() + ROTATE * 1000;
  }

  function newState() {
    return {
      phase: 'first', flash: false, vmLive: false, intel: false, used: {},
      relays: [], backs: [], rotAt: 0, wipeAt: 0, note: '', noteUntil: 0,
      pcs: 1612000 + rand(900), wrong: 0, hostRuns: 0, strikes: 0, macroSeen: false,
      sbxLines: [], vm: 'idle', sbxBusy: false,
      term: ['Terminal connected to the Sandbox VM. Type "help" for commands.'],
      upd: { c2: '', notify: '', other: '', mon: '', day: '' },
      mailSel: 'm1', mailRead: {}, mailExtra: [],
      mailBody: null, sbxBody: null, mapBody: null, updBody: null,
    };
  }

  function onStart(state) {
    G = state;
    newRelays();
    later(1200, () => toast('Mail', 'New message from a company helpdesk: "FW: RE: Invoice January"', '', () => openApp('mail')));
    loop = setInterval(step, 200);
  }
  function onStop() { clearInterval(loop); }
  function onTick() {
    // new infections keep coming in until the servers are in police hands
    if (!seized()) G.pcs += rand(5);
    $$('[data-pcs]').forEach(e => { e.textContent = num(G.pcs); });
  }

  /* ---------- Mail ---------- */
  const MAILS = [
    { id: 'm1', from: 'Helpdesk, Van Dijk Transport', subj: 'FW: RE: Invoice January', time: '08:58', body: `<p>Hello,</p><p>One of our planners got the email below this morning. It is a reply inside a conversation she really had with a supplier last week: his name on top, her own text underneath. She was one click away from opening the invoice.</p><p>The name is right, but the address behind it is not his. Is this Emotet?</p><div class="quote"><p><b>From:</b> Peter de Vries &lt;office@hotel-sol-recife.example&gt;<br><b>Subject:</b> RE: Invoice January</p><p>Hi Anna,</p><p>Please see the attached invoice, as discussed.</p><p>Regards,<br>Peter</p><p>&gt; On 19 Jan 2021 Anna Jansen wrote:<br>&gt; Hi Peter, can you send me the corrected invoice for the January shipments? The amounts on the last one didn't match.</p></div><p>Attachment: <button class="attach" data-open="doc">Invoice_0127.doc</button></p>` },
    { id: 'm2', from: 'Team lead', subj: 'LadyBird: today is the day', time: '08:40', body: `<p>Morning,</p><p>Police in eight countries are waiting for our signal. You run the board today.</p><p><b>What we need first:</b> the list of servers the botnet uses <i>right now</i>. The operators replace servers all the time, so yesterday's list is worthless. An Emotet bot that we control gets every new list they send out.</p><p><b>The teams:</b> every server needs a police team at its door. Some are around the corner, others need a while. Nobody can stand in a data centre for long without being noticed, so a team that arrives early has to pull back after a few seconds.</p><p><b>The strike:</b> one signal, when every team is at the door. If a single server is still standing, the infected PCs fall back to it and the operators replace everything.</p><p>And think ahead: when the servers are ours, 1.6 million PCs will ask <i>us</i> for their next update.</p>` },
    { id: 'm3', from: 'Europol operations room', subj: 'Standing by', time: '08:31', body: `<p>All partners are in position: Netherlands, Germany, United States, United Kingdom, France, Lithuania, Canada and Ukraine.</p><p>We see the targets as soon as you have them on the Botnet map. Teams move on your click, and we strike on your signal.</p>` },
  ];
  function renderMail() {
    const b = G.mailBody; if (!b) return;
    const all = [...G.mailExtra, ...MAILS];
    const sel = all.find(m => m.id === G.mailSel) || all[0]; G.mailRead[sel.id] = true;
    b.innerHTML = `<div class="mail"><nav class="mail-list" aria-label="Inbox">${all.map(m => `<button class="mail-item ${m.id === sel.id ? 'sel' : ''} ${G.mailRead[m.id] ? '' : 'unread'}" data-m="${m.id}">${esc(m.from)}<small>${esc(m.subj)}</small><small>${m.time}</small></button>`).join('')}</nav><article class="mail-view"><h4>${esc(sel.subj)}</h4><div class="mail-meta">From: ${esc(sel.from)} · Today ${sel.time}</div>${sel.body}</article></div>`;
    $$('[data-m]', b).forEach(x => x.onclick = () => { G.mailSel = x.dataset.m; renderMail(); });
    $$('[data-open]', b).forEach(x => x.onclick = () => openApp(x.dataset.open));
  }

  /* ---------- document viewer (+ the trap) ---------- */
  function renderDoc(b) {
    b.innerHTML = `<div class="docv">
      <div class="docv-bar"><span><b>Invoice_0127.doc</b> · Protected view</span><span style="flex:1"></span><button data-a="macro">View macros</button><button data-a="sandbox">Open in Sandbox VM</button></div>
      <div class="docv-warn"><b>SECURITY WARNING</b><span>Macros have been disabled.</span><button data-a="enable">Enable Content</button></div>
      <div class="docv-page">
        <div class="docv-blur" aria-hidden="true"><p><b>INVOICE 0127</b></p><p>De Vries Logistics B.V. · Venlo</p><p>January shipments, corrected amounts as discussed by email</p><p>Pallet transport Venlo to Duisburg, 14 units</p><p>Storage, week 2 and 3</p><p>Customs handling</p><p>Subtotal · VAT 21% · Total due</p><p>Payment within 14 days</p></div>
        <div class="docv-lure"><b>This document is protected</b><p>It was created in an earlier version of Word.</p><p>To see the content, click <b>Enable Content</b> in the yellow bar above.</p></div>
      </div></div>`;
    b.querySelector('[data-a=macro]').onclick = () => openApp('macro');
    b.querySelector('[data-a=sandbox]').onclick = () => openApp('sandbox');
    b.querySelector('[data-a=enable]').onclick = hostInfected;
  }
  function hostInfected() {
    G.hostRuns++; G.wrong++;
    dialog('Invoice_0127.doc', `<p><b>Nothing seemed to happen.</b> The page is still blurry.</p><p>That is how a trojan works. In the background the macro downloaded Emotet and started it. It is now reading the mailbox on this police workstation and will reply inside your real conversations to infect your colleagues.</p><p class="note">Simulation. Investigators only let a suspicious document run inside an isolated VM.</p>`, [{
      label: 'Wipe and reinstall the workstation (+2:00)', cls: 'danger',
      fn: () => { penalty(120); toast('IT support', 'Workstation reinstalled. Two minutes lost. Next time open the document in the Sandbox VM.', 'bad'); },
    }]);
  }

  /* ---------- macro viewer ---------- */
  function renderMacro(b) {
    b.innerHTML = `<div class="macro"><div class="macro-note">Invoice_0127.doc · module ThisDocument · code is shown, not run</div><div class="code"><span class="c">' recreated for this workshop, in the style of the real ones</span>

<span class="k">Private Sub</span> <span class="f">Document_Open</span>()
    <span class="k">Dim</span> kQz, wPb, nTr
    kQz = <span class="f">Join</span>(<span class="f">Array</span>(<span class="s">"po"</span>, <span class="s">"we"</span>, <span class="s">"rsh"</span>, <span class="s">"ell"</span>), <span class="s">""</span>)
    wPb = <span class="s">" -w hidden -enc "</span>
    nTr = <span class="f">jXa</span>(<span class="s">"IwAgAHcAbwByAGsAcwBoAG8AcAAgAHMAaQBtAHUAbABhAHQAaQBvAG4AOgAg"</span> &amp; _
              <span class="s">"AHQAaABlAHIAZQAgAGkAcwAgAG4AbwAgAHIAZQBhAGwAIABjAG8AbQBtAGEA"</span> &amp; _
              <span class="s">"bgBkACAAaQBuACAAaABlAHIAZQAuACAAdABoAGUAIABzAGUAcgB2AGUAcgBz"</span> &amp; _
              <span class="s">"ACAAcwBoAG8AdwAgAHUAcAAgAHcAaABlAG4AIAB0AGgAZQAgAGQAbwBjAHUA"</span> &amp; _
              <span class="s">"bQBlAG4AdAAgAHIAdQBuAHMAIABpAG4AIAB0AGgAZQAgAHMAYQBuAGQAYgBv"</span> &amp; _
              <span class="s">"AHgAIAB2AG0A"</span>)
    <span class="f">Shell</span> kQz &amp; wPb &amp; nTr, <span class="n">0</span>
<span class="k">End Sub</span>

<span class="k">Private Function</span> <span class="f">jXa</span>(hLm)
    <span class="c">' 40 more lines that shuffle letters around</span>
<span class="k">End Function</span>


<span class="c">' analyst note:</span>
<span class="c">' line 3 spells "powershell", started hidden</span>
<span class="c">' the long text is the real command, scrambled so nobody can read it here</span>
<span class="c">' the VM terminal can unscramble it: decode Invoice_0127.doc</span></div></div>`;
    if (!G.macroSeen) {
      G.macroSeen = true;
      later(1500, () => { if (!G.vmLive) toast('Team lead', 'Scrambled, as usual. Reading it won\'t tell us which servers are live today. Let it run in the Sandbox VM.'); });
    }
  }

  /* ---------- Sandbox VM: the bot the police control ---------- */
  const VM_HTML = {
    idle: '<strong>Windows 10 VM</strong><span>Isolated · snapshot clean-win10</span><span style="opacity:.75">The document can run in here without harm.</span>',
    run: '<strong>Invoice_0127.doc is open…</strong><span>Content enabled. Capturing all network traffic.</span>',
    enc: '<strong>Emotet is running</strong><span>Inside the VM only. Your workstation is fine.</span><span style="opacity:.8">It now gets every order and every server list the operators send.</span>',
  };
  const sbxLog = (cls, text) => { G.sbxLines.push([cls, gameClock(true) + '  ' + text]); if (G.sbxLines.length > 60) G.sbxLines.shift(); };
  function renderSbx() {
    const b = G.sbxBody; if (!b) return;
    if (!b.querySelector('.sbx')) {
      b.innerHTML = `<div class="sbx"><div class="sbx-bar"><span>Snapshot <b>clean-win10</b> · Network <b>on</b> · Packet capture <b>on</b></span><span style="flex:1"></span><button class="btn" data-run>Open document & enable content</button></div><div class="sbx-main"><div class="sbx-left"><div class="vm"></div><div class="fw" aria-label="Server list in the bot's memory"></div></div><div class="log" aria-live="polite" aria-label="Packet capture"></div></div></div>`;
      b.querySelector('[data-run]').onclick = sbxRun;
    }
    const vm = b.querySelector('.vm'); vm.className = 'vm ' + G.vm; vm.innerHTML = VM_HTML[G.vm];
    const log = b.querySelector('.log');
    log.innerHTML = G.sbxLines.length ? G.sbxLines.map(([c, t]) => `<div class="${c}">${esc(t)}</div>`).join('') : '<div class="dim">Capture idle. Open the document to start.</div>';
    log.scrollTop = log.scrollHeight;
    const run = b.querySelector('[data-run]');
    run.disabled = G.sbxBusy || G.vmLive;
    run.textContent = G.vmLive ? 'Bot is running' : 'Open document & enable content';
    const list = G.phase === 'first' ? G.relays.map(n => `<div class="fw-row"><span class="mono">${n.ip}</span><span>${n.cc}</span></div>`).join('') : '<p>No server on the list answers any more.</p>';
    const none = G.vmLive ? '<p>Not read yet. Emotet keeps its server list in the memory of its process. The Terminal is connected to this VM.</p>' : '<p>Nothing yet. An Emotet bot keeps the list of servers it may call. We only get to read it if we have a bot.</p>';
    b.querySelector('.fw').innerHTML = `<b>Server list in the bot's memory</b>${G.intel ? list : none}`;
  }
  function sbxRun() {
    if (G.sbxBusy || G.vmLive) return; G.sbxBusy = true; G.vm = 'run';
    const first = G.relays[0].ip;
    const lines = [['dim', '[vm] snapshot restored · Invoice_0127.doc opened in Word'], ['dim', '[vm] "Enable Content" clicked · macro Document_Open starts'], ['smb', '[vm] WINWORD.EXE starts powershell.exe -w hidden -enc IwAgAHcA…'], ['dns', `HTTP  GET http://${first}/update -> 200 OK, 412 KB received`], ['dim', '[vm] saved as C:\\Users\\analyst\\AppData\\Local\\kq7.dll · started with rundll32'], ['bad', '[vm] Emotet is running · service installed, starts with Windows'], ['dns', `HTTP  POST http://${first}/ check-in -> 200 OK`], ['ok', `[vm] orders received: server list with ${RELAYS} addresses`]];
    let i = 0;
    const next = () => {
      sbxLog(lines[i][0], lines[i][1]); i++; renderSbx();
      if (i < lines.length) { later(280, next); return; }
      G.sbxBusy = false; G.vm = 'enc'; G.vmLive = true;
      renderSbx();
      later(700, () => toast('Team lead', 'Emotet is running in our VM. The list of servers it may call sits in the memory of its process. The Terminal is connected to the VM.', '', () => openApp('terminal')));
    };
    next();
  }

  /* ---------- Terminal (a shell inside the sandbox vm) ---------- */
  const PID = '2284';
  function gotIntel() {
    if (G.intel) return;
    G.intel = true;
    // the operators' clock only starts once the player can see the targets
    G.rotAt = Date.now() + ROTATE * 1000;
    renderSbx(); renderMap();
    later(700, () => toast('Team lead', 'Now we see what every infected PC sees, and we get every new list the operators send out. The targets are on the Botnet map.', 'good', () => openApp('map')));
  }
  function termCmd(c) {
    if (!c) return [];
    const parts = c.split(/\s+/), cmd = parts[0].toLowerCase(), arg = parts.slice(1).join(' ').toLowerCase();
    switch (cmd) {
      case 'help': return ['Commands (they run inside the Sandbox VM):', '  ps              list running programs', '  netstat         list network connections', '  dump <pid>      print readable text from a program\'s memory', '  decode <file>   unscramble the macro of a document', '  clear           clear the screen'];
      case 'clear': G.term = []; return [];
      case 'whoami': return ['analyst'];
      case 'ls': case 'dir': return ['Invoice_0127.doc'];
      case 'sudo': return ['Nice try.'];
      case 'ps': case 'tasklist': {
        const rows = ['  PID  PROGRAM                STARTED BY       SIGNED', '  604  explorer.exe           Windows          yes'];
        if (G.vmLive) rows.push(' 1310  WINWORD.EXE            explorer.exe     yes', ' 1988  powershell.exe         WINWORD.EXE      yes   (hidden window)', ` ${PID}  rundll32.exe kq7.dll   powershell.exe   NO`);
        return rows;
      }
      case 'netstat': {
        if (!G.vmLive) return ['No active connections.'];
        if (G.phase !== 'first') return [`  rundll32.exe (${PID})  ->  no server on its list answers`];
        return ['  PROGRAM                 CONNECTS TO', `  rundll32.exe (${PID})     ${G.relays[0].ip}   asks for orders every few minutes`];
      }
      case 'dump': {
        if (!arg) return ['usage: dump <pid>'];
        if (!G.vmLive) return ['dump: nothing unusual is running in the VM yet'];
        if (['604', '1310', '1988'].includes(arg)) return [`Readable text in process ${arg}:`, '  (nothing of interest)'];
        if (arg !== PID && !arg.includes('kq7') && !arg.includes('rundll32')) return [`dump: no process ${parts[1]}. Try "ps".`];
        const out = [`Readable text in rundll32.exe (${PID}), module kq7.dll:`, '  "Control_RunDLL"', '  "%s\\AppData\\Local\\%s.dll"'];
        if (G.phase !== 'first') return [...out, '  server list: no entry answers any more'];
        out.push(`  server list (${G.relays.length}):`, ...G.relays.map(n => '    ' + n.ip), '', `${G.relays.length} servers sent to the Botnet map. Watching this process for new lists.`);
        gotIntel();
        return out;
      }
      case 'decode': {
        if (!arg) return ['usage: decode <file>'];
        if (!arg.includes('invoice') && !arg.includes('macro')) return [`decode: ${parts[1]}: no such file`];
        return ['Invoice_0127.doc · macro Document_Open, unscrambled and simplified:', '', '  start powershell with a hidden window:', '      for each address in a short list:', '          try to download  <address>/update  as  kq7.dll', '          got it?      stop looking', '          no answer?   try the next address', '      start kq7.dll with rundll32, no window', '', 'The addresses in the document only deliver the program.', 'The servers that give the orders are in the running program\'s memory.'];
      }
      default: return [`${parts[0]}: command not found. Type "help".`];
    }
  }
  function renderTerm(b) {
    b.innerHTML = '<div class="term"><div class="term-out"></div><form class="term-line"><label class="prompt" for="termIn">analyst@sandbox-vm:~$</label><input id="termIn" autocomplete="off" spellcheck="false" autocapitalize="off"></form></div>';
    const out = b.querySelector('.term-out'), f = b.querySelector('form'), inp = f.querySelector('input');
    const paint = () => { out.textContent = G.term.join('\n'); out.scrollTop = out.scrollHeight; };
    paint();
    f.onsubmit = e => {
      e.preventDefault();
      const c = inp.value.trim(); inp.value = '';
      G.term.push('analyst@sandbox-vm:~$ ' + c);
      const res = termCmd(c);
      if (c.split(/\s+/)[0].toLowerCase() !== 'clear') G.term.push(...res);
      paint();
    };
    b.addEventListener('click', () => { if (!String(getSelection())) inp.focus(); });
    setTimeout(() => inp.focus(), 0);
  }

  /* ---------- botnet map: the live operation ---------- */
  const RX = 300, RW = 262, BX = 700, BW = 204, NH = 46;
  const ry = i => 36 + i * 68;
  const by = k => 90 + k * 120;
  const targets = () => G.phase === 'first' ? G.relays : G.phase === 'backend' ? G.backs : [];

  function status(n, t) {
    if (n.st === 'prep') return `team on its way · ${secs(n.t1 - t)} s`;
    if (n.st === 'ready') return `AT THE DOOR · waits ${secs(n.t1 - t)} s`;
    if (n.st === 'seized') return 'SEIZED';
    if (n.st === 'missed') return 'STILL LIVE';
    // kept short, the backend boxes are narrow
    return `${n.note || 'send team'} · needs ${need(n)} s`;
  }
  function fill(n, t) {
    if (n.st === 'prep') return Math.min(1, (t - n.t0) / (n.t1 - n.t0));
    if (n.st === 'ready') return Math.max(0, 1 - (t - n.t0) / (n.t1 - n.t0));
    return 0;
  }
  function nodeSvg(n, id, x, y, w, live, t) {
    return `<g class="node ${n.st} ${live ? '' : 'locked'}" data-n="${id}" ${live ? 'role="button" tabindex="0"' : ''} aria-label="${n.ip}, ${TEAMS[n.cc][0]}, ${status(n, t)}"><rect x="${x}" y="${y}" width="${w}" height="${NH}" rx="4"/><text x="${x + 10}" y="${y + 18}">${n.ip}</text><text class="st" x="${x + w - 10}" y="${y + 18}" text-anchor="end">${n.cc}</text><text class="st" x="${x + 10}" y="${y + 35}" data-st="${id}">${status(n, t)}</text><rect class="bar" x="${x + 2}" y="${y + NH - 5}" width="${(w - 4) * fill(n, t)}" height="3" data-bar="${id}" data-w="${w - 4}"/></g>`;
  }
  function barHtml(t) {
    if (seized()) return `<span>All ${RELAYS + 3} servers are in police hands. The infected PCs now report to you.</span><button class="btn ok" data-upd>Open Update console</button>`;
    if (G.flash) return '<span class="warn">Not every team was at the door. The infected PCs are falling back to the servers that are still live…</span>';
    if (!G.intel) return '<span>No targets yet. Nobody outside the botnet knows which servers it uses right now. We would need an Emotet bot of our own to read its server list.</span>';
    const ready = targets().filter(n => n.st === 'ready').length, all = targets().length;
    const go = `<button class="btn" data-go ${ready ? '' : 'disabled'}>Strike now · <span data-rdy>${ready}</span>/${all} at the door</button>`;
    if (G.phase === 'backend') return `<span class="warn">Relays seized. The operators have noticed and are wiping the backend servers. Time left: <b data-wipe>${fmt(secs(G.wipeAt - t))}</b></span>${go}`;
    return `<span>${t < G.noteUntil ? `<b>${G.note}</b>` : 'Click a server to send its team. Strike when every team is at the door.'}</span><span class="rot">Operators change the list in <b data-rot>${fmt(secs(G.rotAt - t))}</b></span>${go}`;
  }
  function renderMap() {
    const b = G.mapBody; if (!b) return;
    const t = Date.now(), first = G.phase === 'first', done = seized();
    const act = document.activeElement, focus = act && b.contains(act) ? act.getAttribute('data-n') : null;

    let pcs = '';
    for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) pcs += `<rect class="pc" x="${28 + c * 24}" y="${58 + r * 40}" width="14" height="10" rx="2"/>`;

    let lines = '', nodes = '';
    if (G.intel) G.relays.forEach((n, i) => {
      const y = ry(i);
      lines += `<path class="ln ${first ? (n.st === 'missed' ? 'hot' : n.st === 'seized' ? 'off' : '') : 'ok'}" d="M160 240L${RX} ${y + NH / 2}"/>`;
      if (!first) lines += `<path class="ln ${done ? 'ok' : 'rev'}" d="M${RX + RW} ${y + NH / 2}L${BX} ${by(n.be) + NH / 2}"/>`;
      nodes += nodeSvg(n, 'r' + i, RX, y, RW, first && !G.flash, t);
    });
    else nodes += `<g class="node unknown locked"><rect x="${RX}" y="${ry(2)}" width="${RW}" height="${NH}" rx="4"/><text class="st" x="${RX + RW / 2}" y="${ry(2) + 28}" text-anchor="middle">servers unknown</text></g>`;
    for (let k = 0; k < 3; k++) {
      if (first) nodes += `<g class="node unknown locked"><rect x="${BX}" y="${by(k)}" width="${BW}" height="${NH}" rx="4"/><text class="st" x="${BX + BW / 2}" y="${by(k) + 28}" text-anchor="middle">not identified yet</text></g>`;
      else nodes += nodeSvg(G.backs[k], 'b' + k, BX, by(k), BW, G.phase === 'backend', t);
    }

    b.innerHTML = `<div class="bmap ${done ? 'safe' : ''}"><svg viewBox="0 0 920 470" role="group" aria-label="Botnet map">
      <text class="col" x="82" y="22" text-anchor="middle">Infected PCs</text><text class="col" x="${RX + RW / 2}" y="22" text-anchor="middle">First layer: relays</text><text class="col" x="${BX + BW / 2}" y="22" text-anchor="middle">Backend</text>
      ${lines}${pcs}
      <text class="count" x="82" y="436" text-anchor="middle" data-pcs>${num(G.pcs)}</text><text class="sub" x="82" y="454" text-anchor="middle">${done ? 'police control' : 'criminal control'}</text>
      ${nodes}</svg><div class="map-bar">${barHtml(t)}</div></div>`;

    $$('[data-n][role=button]', b).forEach(g => {
      g.onclick = () => sendTeam(g.dataset.n);
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sendTeam(g.dataset.n); } };
    });
    // the map is redrawn on every change, so keyboard users would lose their place without this
    if (focus) { const f = b.querySelector(`[data-n="${focus}"][role=button]`); f && f.focus(); }
    const go = b.querySelector('[data-go]'); if (go) go.onclick = strike;
    const upd = b.querySelector('[data-upd]'); if (upd) upd.onclick = () => openApp('update');
  }
  // between state changes only the countdowns move, so only those are touched
  function tickMap(t) {
    const b = G.mapBody; if (!b) return;
    const all = { r: G.relays, b: G.backs };
    $$('[data-st]', b).forEach(e => { const n = all[e.dataset.st[0]][+e.dataset.st.slice(1)]; if (n) e.textContent = status(n, t); });
    $$('[data-bar]', b).forEach(e => { const n = all[e.dataset.bar[0]][+e.dataset.bar.slice(1)]; if (n) e.setAttribute('width', +e.dataset.w * fill(n, t)); });
    const rot = b.querySelector('[data-rot]'); if (rot) rot.textContent = fmt(secs(G.rotAt - t));
    const wipe = b.querySelector('[data-wipe]'); if (wipe) wipe.textContent = fmt(secs(G.wipeAt - t));
  }

  function sendTeam(id) {
    const n = (id[0] === 'r' ? G.relays : G.backs)[+id.slice(1)], t = Date.now();
    if (!n || G.flash) return;
    if (n.st === 'idle') { n.st = 'prep'; n.t0 = t; n.t1 = t + need(n) * 1000; n.note = ''; }
    else if (n.st === 'prep') { n.st = 'idle'; n.note = 'called back'; }
    else return;
    renderMap();
  }
  function step() {
    if (!G || G.dead || G.won || G.flash || !G.intel) return;
    const t = Date.now(); let changed = false;
    targets().forEach(n => {
      if (n.st === 'prep' && t >= n.t1) { n.st = 'ready'; n.t0 = t; n.t1 = t + HOLD * 1000; changed = true; }
      else if (n.st === 'ready' && t >= n.t1) { n.st = 'idle'; n.note = 'pulled back'; changed = true; }
    });
    if (G.phase === 'first' && t >= G.rotAt) { rotate(t); changed = true; }
    if (G.phase === 'backend' && t >= G.wipeAt) { backendLost('The operators wiped the backend servers before your teams were inside.'); return; }
    if (G.note && t >= G.noteUntil) { G.note = ''; changed = true; }
    if (changed) renderMap(); else tickMap(t);
  }
  // the operators swap one relay for a new one, as they did all the time
  function rotate(t) {
    const i = rand(G.relays.length), old = G.relays[i];
    const cc = shuffle(Object.keys(TEAMS).filter(c => c !== old.cc))[0];
    G.relays[i] = newRelay(cc);
    G.rotAt = t + ROTATE * 1000;
    G.note = `List changed: ${old.ip} is out, ${G.relays[i].ip} (${cc}) is new.`; G.noteUntil = t + 9000;
    sbxLog('ok', `[vm] orders received: new server list · ${old.ip} replaced by ${G.relays[i].ip}`);
    renderSbx();
  }
  function strike() {
    const list = targets(), t = Date.now();
    if (G.flash || !list.some(n => n.st === 'ready')) return;
    G.strikes++;
    const missing = list.filter(n => n.st !== 'ready').length;
    if (G.phase === 'backend') {
      if (missing) { backendLost(`Only ${list.length - missing} of ${list.length} backend teams were at the door. The operators wiped the rest and moved on.`); return; }
      list.forEach(n => { n.st = 'seized'; });
      G.phase = 'seized';
      G.mailExtra.unshift({ id: 'm0', from: 'Public prosecutor', subj: 'Court order for the update', time: gameClock(), body: `<p>The examining judge has signed. You may send one update to the infected PCs.</p><p><b>Deadline:</b> on <b>25 April 2021 at 12:00</b> Emotet has to remove itself from every PC. Not earlier: we need those three months to secure the evidence and to work out who the victims are. Not later: the order ends that day.</p><p>What else the update does is your call. Stay within what we can defend in court.</p>` });
      renderMap(); renderUpd(); renderSbx(); renderMail();
      toast('Europol operations room', `All ${RELAYS + 3} servers confirmed. Every infected PC now reports to police servers, and they will ask for their next update. Open the Update console.`, 'good', () => openApp('update'), 14000);
      toast('Mail', 'New message from the public prosecutor: "Court order for the update"', '', () => { G.mailSel = 'm0'; openApp('mail'); renderMail(); }, 14000);
      return;
    }
    if (missing) {
      G.wrong++; penalty(60); G.flash = true;
      list.forEach(n => { n.st = n.st === 'ready' ? 'seized' : 'missed'; });
      renderMap();
      // the message waits until the map has shown the fallback, because it would cover the map
      later(3500, () => {
        G.flash = false; newRelays(); renderMap();
        sbxLog('ok', '[vm] orders received: new server list · all addresses replaced'); renderSbx();
        toast('Botnet map', `${missing} team${missing === 1 ? ' was' : 's were'} not at the door when you gave the signal. The infected PCs fell back to the server${missing === 1 ? '' : 's'} still standing, and the operators replaced the whole list. One minute lost, all teams are back at base.`, 'bad', null, 12000);
      });
      return;
    }
    list.forEach(n => { n.st = 'seized'; });
    G.phase = 'backend';
    G.backs = ['NL', 'NL', ['CA', 'US', 'UA'][rand(3)]].map(cc => ({ ip: freshIp(false), cc, st: 'idle', t0: 0, t1: 0, note: '' }));
    G.wipeAt = t + WIPE * 1000;
    sbxLog('bad', '[vm] no server on the list answers any more');
    renderMap(); renderSbx();
  }
  function backendLost(why) {
    G.wrong++; G.phase = 'first'; G.backs = []; newRelays(); renderMap();
    sbxLog('ok', '[vm] orders received: new server list · all addresses replaced'); renderSbx();
    toast('Europol operations room', `${why} With the backend still theirs, they set up new relays within minutes. The operation starts again.`, 'bad', null, 12000);
  }

  /* ---------- update console ---------- */
  const FIELDS = ['c2', 'notify', 'other', 'mon', 'day'];
  const TODAY = new Date(2021, 0, 26, 12);
  const when = u => new Date(2021, +u.mon, +u.day, 12);
  const dateText = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  // first rule that matches explains what goes wrong with this update
  const RULES = [
    [u => u.other === 'true', () => 'The court order does not allow that', () => '<p>The police may only touch what Emotet itself put on the PCs. Deleting other programs on 1.6 million computers nobody has ever looked at is not covered, and one mistake could break the computers of a hospital.</p><p>Cleaning up the rest is up to the owners. For that they first have to know.</p>'],
    [u => when(u) <= TODAY, () => 'The evidence is gone', u => `<p>${dateText(when(u))} is today or already past, so Emotet removes itself the moment the update arrives. With it goes the proof: which PCs were infected, what was stolen from them and what else was installed.</p><p>Nobody had time to work out who the victims are, so nobody can be told to change passwords or look for the other malware.</p>`],
    [u => u.c2 === 'operators', () => 'The PCs still listen to the old addresses', () => '<p>Every infected PC keeps calling the server list it already has. That only stays safe for as long as the police hold every one of those addresses.</p><p>The people behind Emotet are still out there. If they get a single address back, they get the botnet back.</p>'],
    [u => +u.mon === 4 && +u.day === 25, () => 'That is 25 May 2021', () => '<p><span class="mono">tm_mon</span> counts the months since January: January is 0, so 4 is May. The court order ends on 25 April, a month before your update would act.</p><p>You are in good company. The first researcher who read the real police update saw a 3 there and announced 25 March.</p>'],
    [u => !(+u.mon === 3 && +u.day === 25), u => `That is ${dateText(when(u))}`, () => '<p>The court order says 25 April 2021, 12:00. Earlier, and there is not enough time to secure the evidence and find the victims. Later, and the order has run out.</p>'],
    [u => u.notify === 'false', () => 'The owners never find out', () => '<p>Emotet disappears in April, but TrickBot, Qakbot or Ryuk that came in through it stay, and the stolen passwords stay stolen.</p><p>Nobody knows they should clean their PC or change their passwords.</p>'],
  ];
  function renderUpd() {
    const b = G.updBody; if (!b) return;
    if (!seized()) {
      b.innerHTML = '<div class="upd"><h4>No servers under police control yet</h4><p>Once the botnet\'s servers are seized, every infected PC will ask this console for its next update.</p></div>';
      return;
    }
    const sent = G.phase === 'done', u = G.upd, off = sent ? 'disabled' : '';
    const pick = (k, opts) => `<select data-k="${k}" aria-label="${k}" ${off}><option value="">?</option>${opts.map(([v, t]) => `<option value="${v}" ${u[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const box = k => `<input data-k="${k}" aria-label="tm_${k === 'mon' ? 'mon' : 'mday'}" value="${esc(u[k])}" inputmode="numeric" maxlength="2" autocomplete="off" ${off}>`;
    const bool = [['false', 'false'], ['true', 'true']];
    b.innerHTML = `<div class="upd"><div class="tiles"><div class="tile"><small>Servers seized</small><div class="v green">${RELAYS + 3}/${RELAYS + 3}</div></div><div class="tile"><small>PCs checking in</small><div class="v" data-pcs>${num(G.pcs)}</div></div><div class="tile"><small>Update sent</small><div class="v ${sent ? 'green' : ''}">${sent ? 'Yes' : 'No'}</div></div></div>
      <h4>${sent ? 'Update sent' : 'Write the last update'}</h4>
      <p>Emotet keeps itself up to date: each infected PC regularly asks its servers for a new version and installs whatever it gets. Those servers are now yours. This is the update they will get. Fill in the five boxes.</p>
      <div class="code"><span class="c">// EmotetLoader.dll, recreated and simplified for this workshop</span>

<span class="c">// who the PC talks to from now on</span>
<span class="k">#define</span> C2_SERVERS            ${pick('c2', [['operators', 'OPERATORS'], ['police', 'POLICE']])}
<span class="c">// tell the owners of the PCs what was on them</span>
<span class="k">#define</span> NOTIFY_OWNERS         ${pick('notify', bool)}
<span class="c">// also delete TrickBot, Qakbot and Ryuk that came in through Emotet</span>
<span class="k">#define</span> REMOVE_OTHER_MALWARE  ${pick('other', bool)}

<span class="k">void</span> <span class="f">on_install</span>(<span class="k">void</span>)
{
    <span class="k">struct</span> tm when = {<span class="n">0</span>};
    <span class="c">// years since 1900, so this is 2021</span>
    when.tm_year = <span class="n">121</span>;
    <span class="c">// months since January</span>
    when.tm_mon  = ${box('mon')};
    <span class="c">// day of the month</span>
    when.tm_mday = ${box('day')};
    when.tm_hour = <span class="n">12</span>;

    <span class="f">talk_only_to</span>(C2_SERVERS);
    <span class="f">wait_until</span>(when);
    <span class="c">// removes Emotet's service and autostart entry, nothing else</span>
    <span class="f">uninstall_emotet</span>();
}</div>
      <div class="upd-send"><button class="btn" data-send ${off}>Compile & send to all PCs</button><span>${sent ? 'Queued for every infected PC.' : 'Every infected PC will install this.'}</span></div>
      <p class="fine">Figures in this game are simulated.</p></div>`;
    // the boxes keep their own value while typing, redrawing here would take the cursor away
    $$('[data-k]', b).forEach(x => { x.oninput = x.onchange = () => { G.upd[x.dataset.k] = x.value.trim(); }; });
    b.querySelector('[data-send]').onclick = sendUpdate;
  }
  function sendUpdate() {
    if (G.phase !== 'seized') return;
    const u = G.upd;
    const empty = FIELDS.filter(k => u[k] === '').length;
    const numbers = /^\d{1,2}$/.test(u.mon) && /^\d{1,2}$/.test(u.day) && +u.mon <= 11 && +u.day >= 1 && +u.day <= 31;
    if (empty || !numbers) {
      dialog('Compiler error', `<p>${empty ? `${empty} box${empty === 1 ? ' is' : 'es are'} still empty.` : '<span class="mono">tm_mon</span> has to be a number from 0 to 11 and <span class="mono">tm_mday</span> from 1 to 31.'}</p><p class="note">Nothing was sent.</p>`, [{ label: 'Back to the code' }]);
      return;
    }
    const bad = RULES.find(r => r[0](u));
    if (!bad) { G.phase = 'done'; renderUpd(); renderMap(); win(); return; }
    G.wrong++; penalty(60);
    dialog(bad[1](u), bad[2](u) + '<p class="note">Simulation: the update was pulled back. One minute lost. Change the code and send again.</p>', [{ label: 'Back to the code' }]);
  }

  /* ---------- level definition ---------- */
  window.KS.engine.run({
    id: 2,
    objective: 'Take the Emotet botnet away from its operators',
    mode: window.KS.desktop.mode({
      label: 'THTC-WS',
      clock: { start: [9, 4], speed: 6, date: '26/01/2021' },
      icons: [['mail', 'Mail'], ['doc', 'Invoice_0127.doc'], ['macro', 'Macro viewer'], ['sandbox', 'Sandbox VM'], ['terminal', 'Terminal'], ['map', 'Botnet map'], ['update', 'Update console']],
      apps: {
        mail: { title: 'Mail', w: 760, h: 470, mount(b) { G.mailBody = b; renderMail(); }, unmount() { G.mailBody = null; } },
        doc: { title: 'Invoice_0127.doc (Protected view)', w: 620, h: 470, mount(b) { renderDoc(b); } },
        macro: { title: 'Macro viewer: Invoice_0127.doc', w: 700, h: 470, dark: true, mount(b) { renderMacro(b); } },
        sandbox: { title: 'Sandbox VM: clean-win10', w: 900, h: 470, dark: true, mount(b) { G.sbxBody = b; renderSbx(); }, unmount() { G.sbxBody = null; } },
        terminal: { title: 'Terminal: sandbox-vm', w: 700, h: 400, dark: true, mount(b) { renderTerm(b); } },
        map: { title: 'Botnet map', w: 940, h: 560, dark: true, mount(b) { G.mapBody = b; renderMap(); }, unmount() { G.mapBody = null; } },
        update: { title: 'Update console', w: 720, h: 600, dark: true, mount(b) { G.updBody = b; renderUpd(); }, unmount() { G.updBody = null; } },
      },
    }),
    hints: [
      'Never click "Enable Content" on this workstation. Open the document in the Sandbox VM instead. Once Emotet runs there, the Terminal can read what it keeps in memory: type <span class="mono">help</span>.',
      `On the Botnet map every server needs a police team, and every team needs a different time to get there. A team at the door can only wait ${HOLD} seconds, so sending all teams at once doesn't work. Start with the slowest.`,
      `Terminal: <span class="mono">ps</span>, then <span class="mono">dump ${PID}</span>. Map: send the slowest team first, and each other team when the slowest has about as many seconds left as that team needs. Strike when all are at the door, then do the same for the backend. Update: <span class="mono">C2_SERVERS POLICE</span>, <span class="mono">NOTIFY_OWNERS true</span>, <span class="mono">REMOVE_OTHER_MALWARE false</span>, <span class="mono">tm_mon 3</span> (months count from 0, so 3 is April), <span class="mono">tm_mday 25</span>.`,
    ],
    newState,
    onStart,
    onStop,
    onTick,
    win: {
      label: g => `Update sent · ${g.winClock}`,
      html: '<h2>The botnet now answers to the police</h2><p>The infected PCs have stopped listening to the criminals. Emotet will remove itself on 25 April 2021. Until then investigators can secure the evidence, and the owners can be told what was on their PC.</p>',
    },
    debrief: {
      title: g => `You took Emotet down at ${g.winClock}`,
      stats: g => [['Your time', fmt(g.endEl)], ['Hints used', g.hints], ['Strikes called', g.strikes], ['Wrong moves', g.wrong]],
      quiz: [
        { q: 'Why did the Emotet email look trustworthy?', o: ['It came from a government address', 'It was a reply inside a real, stolen email conversation', 'It was signed with a valid certificate', 'It had no attachment'], a: 1, why: 'Emotet stole mailboxes from infected PCs and answered inside existing conversations, with the original text quoted underneath.' },
        { q: 'What does clicking "Enable Content" in such a document do?', o: ['It shows the hidden text of the invoice', 'It scans the document for viruses', 'It lets the macro run, which downloads and starts the malware', 'It sends the document back to the sender'], a: 2, why: 'The blurry page is bait. The click only allows the macro to run, and the macro fetches Emotet.' },
        { q: 'Why did the police have to seize all servers at the same time?', o: ['Search warrants are only valid for one day', 'Infected PCs know several servers and switch to any that is left', 'The servers shared one power supply', 'Otherwise the PCs would uninstall Emotet themselves'], a: 1, why: 'Every infected PC carries a list of servers and gets new lists through updates. One surviving server is enough for the operators to keep the botnet.' },
        { q: 'What did the uninstall on 25 April 2021 not fix?', o: ['Emotet starting with Windows', 'Emotet\'s connection to its servers', 'Other malware that came in through Emotet, and stolen passwords', 'Nothing, the PCs were clean afterwards'], a: 2, why: 'The update removed Emotet only. TrickBot, Qakbot or ransomware installed through it stayed, and stolen passwords stay stolen until they are changed.' },
      ],
    },
  });
})();
