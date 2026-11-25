/* Level 01: WannaCry (ransomware). Content and puzzle logic only.
 * The frame (HUD, hints, toasts, win, debrief) comes from shared/engine.js;
 * the desktop (icons, windows, taskbar, in-game clock) from shared/modes/desktop.js.
 *
 * Win path: detonate in the sandbox -> spot the DNS request before any SMB traffic
 * -> confirm the domain is unregistered -> register it -> point its A record at the
 * sinkhole IP -> detonate again: the sample quits.
 * Trap: running the sample on the workstation itself (+2:00 penalty).
 */
(function () {
  'use strict';
  const { $$, esc, rand } = window.KS;
  const { toast, dialog, overlay, later, win, penalty } = window.KS.game;
  const { openApp, gameClock } = window.KS.desktop;

  let G = null; // this attempt's state, set in onStart

  /* ---------- the simulated internet ---------- */
  const DOMAIN = 'iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com';
  const SINK = '203.0.113.37';
  const KNOWN = { 'google.com': '216.58.204.46', 'bbc.co.uk': '151.101.0.81', 'microsoft.com': '40.76.4.15', 'nhs.uk': '51.140.24.98' };
  const tgt = () => G.owned[DOMAIN];
  const ksOn = () => !!(tgt() && tgt().dns === SINK);

  function newState() {
    return {
      hostRuns: 0, sbxRuns: 0, owned: {},
      infected: 47213, countries: 99, rateHist: [], sinkHits: 0, sinkLive: false,
      mailSel: 'm1', mailRead: {}, mailExtra: [], fileSel: null, txtOpen: false,
      sbxLines: [], vm: 'idle', sbxBusy: false,
      disSel: 'WinMain', term: ['MT workstation terminal. Type "help" for commands.'],
      ddQ: '', ddRes: null, ddCheckout: null, ddErr: {}, news: [], newsIdx: 0,
      sbxBody: null, brBody: null, monBody: null, mailBody: null, folderBody: null,
    };
  }

  /* ---------- news + outbreak simulation ---------- */
  const NEWS_START = ['NHS trusts in England divert ambulances as computers are locked', 'Telefónica asks staff in Madrid to shut down their PCs', 'Ransom notes demand $300 in Bitcoin, doubling after 3 days'];
  const NEWS_MORE = ['Renault stops production at several plants', 'Deutsche Bahn departure boards display ransom note', 'FedEx reports Windows systems affected', 'Russian Interior Ministry confirms around 1,000 PCs hit', 'Europol calls the attack unprecedented in scale', 'Universities in China report infected campus networks', 'Security firms: malware spreads via SMB port 445 using leaked NSA exploit'];

  function onStart(state) {
    G = state;
    G.news = NEWS_START.slice();
    later(1200, () => toast('Mail', 'New message from a fellow researcher: "Sample of the NHS thing"', '', () => openApp('mail')));
  }
  function onTick() {
    const on = ksOn();
    if (!G.won || on) {
      const per = on ? (Math.random() < .25 ? 1 : 0) : 30 + Math.random() * 20;
      G.infected += per; G.rateHist.push(Math.round(per * 60));
      if (G.rateHist.length > 120) G.rateHist.shift();
      if (!on && G.countries < 150 && Math.random() < .14) G.countries++;
    }
    G.sinkHits = on ? Math.round(3600 + Math.random() * 1400) : 0;
    if (!on && Math.floor(window.KS.game.elapsed()) % 24 === 0 && G.newsIdx < NEWS_MORE.length) G.news.unshift(NEWS_MORE[G.newsIdx++]);
    renderMon(false);
  }

  /* ---------- Mail ---------- */
  const MAILS = [
    { id: 'm1', from: 'Fellow researcher', subj: 'Sample of the NHS thing', time: '14:31', body: `<p>Hey,</p><p>Got hold of a sample of the ransomware that's hitting the NHS and half of Europe. People are calling it WannaCry or WanaCrypt0r. Nobody seems to know yet why it spreads so fast.</p><p>I put it in your <b>samples</b> folder as <span class="attach">wcry_sample.exe</span></p><p>It's live. Treat it like it bites.</p>` },
    { id: 'm2', from: 'News alert', subj: 'Hospitals hit by ransomware', time: '14:12', body: `<p>Hospitals and GP surgeries across England are turning patients away after computers were locked by ransomware demanding $300 in Bitcoin. Similar reports are coming in from Spain, Russia and dozens of other countries.</p><p>Security firms say the malware spreads by itself across networks through a Windows SMB flaw that Microsoft patched in March (MS17-010).</p>` },
    { id: 'm3', from: 'Hosting provider', subj: 'Your server sinkhole-01 is online', time: '09:02', body: `<p>Your server <b>sinkhole-01</b> is up and answering HTTP on port 80.</p><p>IP address: <span class="mono">${SINK}</span></p><p>Any domain whose DNS A record points to this IP will send its traffic to this server, and every request appears in your logs.</p>` },
  ];
  function renderMail() {
    const b = G.mailBody; if (!b) return;
    const list = [...G.mailExtra, ...MAILS];
    const sel = list.find(m => m.id === G.mailSel) || list[0]; G.mailRead[sel.id] = true;
    b.innerHTML = `<div class="mail"><nav class="mail-list" aria-label="Inbox">${list.map(m => `<button class="mail-item ${m.id === sel.id ? 'sel' : ''} ${G.mailRead[m.id] ? '' : 'unread'}" data-m="${m.id}">${esc(m.from)}<small>${esc(m.subj)}</small><small>${m.time}</small></button>`).join('')}</nav><article class="mail-view"><h4>${esc(sel.subj)}</h4><div class="mail-meta">From: ${esc(sel.from)} · Today ${sel.time}</div>${sel.body}</article></div>`;
    $$('[data-m]', b).forEach(x => x.onclick = () => { G.mailSel = x.dataset.m; renderMail(); });
  }

  /* ---------- samples folder (+ the trap) ---------- */
  const FILES = [{ n: 'wcry_sample.exe', size: '3,723 KB', kind: 'exe' }, { n: 'README_quarantine.txt', size: '1 KB', kind: 'txt' }];
  const README = 'Everything in this folder is LIVE malware.\n\n- Do not run anything from here on this workstation.\n- Detonate samples in the Sandbox VM (isolated, snapshot restores in seconds).\n- Read the code in the Disassembler.';
  function renderFolder() {
    const b = G.folderBody; if (!b) return;
    const ICON = window.KS.desktop.ICON;
    const f = FILES.find(x => x.n === G.fileSel);
    const exe = f && f.kind === 'exe';
    b.innerHTML = `<div class="folder-bar"><button data-a="run" ${f ? '' : 'disabled'}>${f && !exe ? 'Open' : 'Run'}</button><button data-a="sbx" ${exe ? '' : 'disabled'}>Open in Sandbox VM</button><button data-a="dis" ${exe ? '' : 'disabled'}>Open in Disassembler</button></div>
    <div class="files">${FILES.map(x => `<button class="file ${x.n === G.fileSel ? 'sel' : ''}" data-f="${x.n}">${ICON[x.kind]}<span>${x.n}</span></button>`).join('')}</div>
    <div class="file-info">${!f ? 'Select a file.' : (!exe && G.txtOpen ? `<pre>${esc(README)}</pre>` : `${esc(f.n)} · ${f.size}${exe ? ' · Publisher: unknown' : ''}`)}</div>`;
    $$('[data-f]', b).forEach(x => { x.onclick = () => { G.fileSel = x.dataset.f; G.txtOpen = false; renderFolder(); }; x.ondblclick = () => { G.fileSel = x.dataset.f; folderAct('run'); }; });
    $$('[data-a]', b).forEach(x => x.onclick = () => folderAct(x.dataset.a));
  }
  function folderAct(a) {
    const f = FILES.find(x => x.n === G.fileSel); if (!f) return;
    if (a === 'run') {
      if (f.kind === 'txt') { G.txtOpen = true; renderFolder(); return; }
      dialog('Open file: security warning', `<p>Do you want to run <b>wcry_sample.exe</b>?</p><p class="note">Publisher: unknown. This file came from the internet and can harm your computer.</p>`, [{ label: 'Run', cls: 'danger', fn: hostInfected }, { label: 'Cancel', cls: 'ghost' }]);
    } else if (a === 'sbx') openApp('sandbox');
    else if (a === 'dis') openApp('disasm');
  }
  function hostInfected() {
    G.hostRuns++;
    const o = overlay(`<div class="ransom" role="alertdialog" aria-label="Your files have been encrypted">
      <div class="left"><svg viewBox="0 0 100 100"><rect x="22" y="44" width="56" height="44" rx="6" fill="#ffd84d"/><path d="M34 44V32a16 16 0 0132 0v12" fill="none" stroke="#ffd84d" stroke-width="9"/><circle cx="50" cy="63" r="6" fill="#5f0805"/><rect x="47" y="64" width="6" height="13" fill="#5f0805"/></svg>
        <div><div>Price goes up in</div><div class="count">02:23:59:12</div></div>
        <div><div>Your files will be lost in</div><div class="count">06:23:59:12</div></div></div>
      <div class="right"><h2>Ooops, your files have been encrypted!</h2>
        <p>Your documents, photos, databases and other important files are no longer accessible because they have been encrypted. You could look for a way to recover them, but nobody can decrypt them without our key.</p>
        <p>Send <b>$300 worth of Bitcoin</b> to the address below. After three days the price doubles. After seven days your files are deleted.</p>
        <div class="addr">Bitcoin: 1SIMULATIONxDoNotPayxThisIsAWorkshop</div>
        <p style="font-size:13px;opacity:.8">Meanwhile the worm on your workstation is already scanning your home network on port 445.</p></div>
      <div class="sim-banner"><span>SIMULATION. You ran a live sample on your own workstation. Analysts only detonate samples inside an isolated VM.</span><button class="btn">Restore last night's backup (+2:00)</button></div></div>`);
    const btn = o.querySelector('.sim-banner button');
    btn.onclick = () => { penalty(120); o.remove(); toast('Backup', 'Workstation restored from last night\'s backup. Two minutes lost. Next time, use the Sandbox VM.', 'bad'); };
    btn.focus();
  }

  /* ---------- Sandbox VM ---------- */
  const VM_HTML = {
    idle: '<strong>Windows 7 VM</strong><span>Isolated · snapshot clean-win7-x86</span><span style="opacity:.75">Click <b>Detonate</b> to run the sample in here.</span>',
    run: '<strong>Running wcry_sample.exe…</strong><span>Capturing all network traffic</span>',
    enc: '<strong>Ooops, your files have been encrypted!</strong><span>Inside the VM only. Your workstation is fine.</span><span style="opacity:.8">Check the packet capture to see what happened first.</span>',
    clean: '<strong>wcry_sample.exe quit</strong><span>It made one web request, got an answer, and exited.</span><span>No files encrypted. No SMB scanning.</span>',
  };
  const rip = () => [11 + rand(200), rand(255), rand(255), 1 + rand(253)].join('.');
  function renderSbx() {
    const b = G.sbxBody; if (!b) return;
    if (!b.querySelector('.sbx')) {
      b.innerHTML = `<div class="sbx"><div class="sbx-bar"><span>Snapshot <b>clean-win7-x86</b> · Network <b>on</b> · Packet capture <b>on</b></span><span style="flex:1"></span><button class="btn" data-run>Detonate wcry_sample.exe</button></div><div class="sbx-main"><div class="vm"></div><div class="log" aria-live="polite" aria-label="Packet capture"></div></div></div>`;
      b.querySelector('[data-run]').onclick = sbxRun;
    }
    const vm = b.querySelector('.vm'); vm.className = 'vm ' + G.vm; vm.innerHTML = VM_HTML[G.vm];
    const log = b.querySelector('.log');
    log.innerHTML = G.sbxLines.length ? G.sbxLines.map(([c, t]) => `<div class="${c}">${esc(t)}</div>`).join('') : '<div class="dim">Capture idle. Detonate the sample to start.</div>';
    log.scrollTop = log.scrollHeight;
    b.querySelector('[data-run]').disabled = G.sbxBusy;
    b.querySelector('[data-run]').textContent = G.sbxRuns ? 'Revert snapshot & detonate again' : 'Detonate wcry_sample.exe';
  }
  function sbxRun() {
    if (G.sbxBusy) return; G.sbxBusy = true; G.sbxRuns++; G.sbxLines = []; G.vm = 'run';
    const o = tgt(), ok = ksOn(), url = `http://www.${DOMAIN}/`;
    const lines = [['dim', '[vm] snapshot restored · sample copied to C:\\Users\\analyst\\Desktop'], ['dim', '[vm] start wcry_sample.exe (pid 1872)'], ['dns', `DNS   query  A www.${DOMAIN}`]];
    if (!o) lines.push(['bad', 'DNS   answer NXDOMAIN (domain does not exist)'], ['bad', `HTTP  GET ${url} -> failed, no address`]);
    else if (!o.dns) lines.push(['bad', 'DNS   answer: domain exists but has no A record'], ['bad', `HTTP  GET ${url} -> failed, no address`]);
    else if (!ok) lines.push(['dns', `DNS   answer A ${o.dns}`], ['bad', `HTTP  GET ${url} -> ${o.dns}:80 connection timed out`]);
    else lines.push(['ok', `DNS   answer A ${SINK}`], ['ok', `HTTP  GET ${url} -> 200 OK (sinkhole-01)`], ['ok', '[vm] pid 1872 exited with code 0'], ['ok', '[vm] files changed: 0 · SMB connections: 0']);
    if (!ok) lines.push(
      ['dim', '[vm] service installed: mssecsvc2.0'],
      ['dim', '[vm] dropped C:\\Windows\\tasksche.exe and started it'],
      ['smb', 'SMB   10.0.2.15 -> 10.0.2.1:445   probe (local subnet)'],
      ['smb', 'SMB   10.0.2.15 -> 10.0.2.2:445   probe (local subnet)'],
      ['smb', `SMB   10.0.2.15 -> ${rip()}:445   probe (random internet host)`],
      ['smb', `SMB   10.0.2.15 -> ${rip()}:445   probe (random internet host)`],
      ['smb', `SMB   10.0.2.15 -> ${rip()}:445   probe (random internet host)`],
      ['bad', '[vm] Documents\\thesis_final_v3.docx -> thesis_final_v3.docx.WNCRY'],
      ['bad', '[vm] 1,412 files encrypted · ransom window shown']);
    let i = 0;
    const step = () => {
      if (!G || G.dead) return;
      G.sbxLines.push([lines[i][0], gameClock(true) + '  ' + lines[i][1]]); i++; renderSbx();
      if (i < lines.length) { G.timers.push(setTimeout(step, 300)); return; }
      G.sbxBusy = false; G.vm = ok ? 'clean' : 'enc'; renderSbx();
      if (ok) win();
      else if (G.sbxRuns === 1) later(700, () => toast('Sandbox VM', 'The sample only encrypted the VM. The packet capture lists everything it did, in order.'));
    };
    step();
  }

  /* ---------- Disassembler ---------- */
  const DIS = {
    WinMain: `<span class="a">.text:00408140</span>
<span class="k">int</span> <span class="k">__stdcall</span> <span class="f">WinMain</span>(HINSTANCE hInst, HINSTANCE hPrev, LPSTR lpCmdLine, <span class="k">int</span> nShowCmd)
{
    <span class="k">char</span>      szUrl[<span class="n">57</span>];
    HINTERNET hNet, hUrl;

    strcpy(szUrl, <span class="s">"http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com"</span>);

    hNet = <span class="f">InternetOpenA</span>(<span class="n">0</span>, INTERNET_OPEN_TYPE_DIRECT, <span class="n">0</span>, <span class="n">0</span>, <span class="n">0</span>);
    hUrl = <span class="f">InternetOpenUrlA</span>(hNet, szUrl, <span class="n">0</span>, <span class="n">0</span>, <span class="n">0x84000000</span>, <span class="n">0</span>);

    <span class="k">if</span> ( hUrl )
    {
        <span class="f">InternetCloseHandle</span>(hNet);
        <span class="f">InternetCloseHandle</span>(hUrl);
        <span class="k">return</span> <span class="n">0</span>;                <span class="c">// ...and that's it?</span>
    }

    <span class="f">InternetCloseHandle</span>(hNet);
    <span class="f">InternetCloseHandle</span>(<span class="n">0</span>);
    <span class="f">sub_408090</span>();                 <span class="c">// everything else happens in here</span>
    <span class="k">return</span> <span class="n">0</span>;
}`,
    sub_408090: `<span class="a">.text:00408090</span>
<span class="k">void</span> <span class="f">sub_408090</span>()
{
    <span class="c">// 1. install itself as a Windows service</span>
    <span class="f">create_service</span>(<span class="s">"mssecsvc2.0"</span>, <span class="s">"Microsoft Security Center (2.0) Service"</span>);

    <span class="c">// 2. drop and start the encryptor (ransom part)</span>
    <span class="f">drop_resource</span>(<span class="s">"C:\\\\Windows\\\\tasksche.exe"</span>);
    <span class="f">CreateProcessA</span>(<span class="s">"C:\\\\Windows\\\\tasksche.exe"</span>, ...);

    <span class="c">// 3. start the worm (spreading part)</span>
    <span class="f">CreateThread</span>(<span class="n">0</span>, <span class="n">0</span>, <span class="f">scan_local_subnet</span>, <span class="n">0</span>, <span class="n">0</span>, <span class="n">0</span>);
    <span class="k">for</span> (i = <span class="n">0</span>; i &lt; <span class="n">128</span>; i++)
        <span class="f">CreateThread</span>(<span class="n">0</span>, <span class="n">0</span>, <span class="f">scan_random_internet</span>, i, <span class="n">0</span>, <span class="n">0</span>);
}`,
    scan_local_subnet: `<span class="a">.text:00407BD0</span>
<span class="k">DWORD</span> <span class="f">scan_local_subnet</span>(LPVOID)
{
    <span class="c">// for every address in this PC's own subnet:</span>
    <span class="c">//   is TCP port 445 (SMB) open?</span>
    <span class="c">//   yes -> try EternalBlue (MS17-010)</span>
    <span class="c">//          on success: plant DoublePulsar backdoor,</span>
    <span class="c">//          copy wcry_sample.exe over and run it</span>
}`,
    scan_random_internet: `<span class="a">.text:00407CE0</span>
<span class="k">DWORD</span> <span class="f">scan_random_internet</span>(LPVOID)
{
    <span class="c">// pick a random public IPv4 address</span>
    <span class="c">// is TCP port 445 open?  -> same attack as the local scan</span>
    <span class="c">// 128 of these threads run at the same time</span>
}`,
    strings: `<span class="a">Address    String</span>
<span class="a">0040C2A8</span>   <span class="s">http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com</span>
<span class="a">0040C2E4</span>   <span class="s">mssecsvc2.0</span>
<span class="a">0040C2F0</span>   <span class="s">Microsoft Security Center (2.0) Service</span>
<span class="a">0040C318</span>   <span class="s">%s -m security</span>
<span class="a">0040C328</span>   <span class="s">C:\\%s\\qeriuwjhrf</span>
<span class="a">0040C33C</span>   <span class="s">tasksche.exe</span>
<span class="a">0040C34C</span>   <span class="s">\\\\%s\\IPC$</span>
<span class="a">0040C358</span>   <span class="s">\\\\192.168.56.20\\IPC$</span>
<span class="a">0040C36C</span>   <span class="s">WanaCrypt0r</span>
<span class="a">0040C378</span>   <span class="s">.WNCRY</span>`,
  };
  function renderDis(b) {
    const fns = ['WinMain', 'sub_408090', 'scan_local_subnet', 'scan_random_internet'];
    b.innerHTML = `<div class="dis"><nav class="dis-side" aria-label="Functions"><h5>Functions</h5>${fns.map(f => `<button data-fn="${f}" class="${G.disSel === f ? 'sel' : ''}">${f}</button>`).join('')}<h5>Data</h5><button data-fn="strings" class="${G.disSel === 'strings' ? 'sel' : ''}">Strings</button></nav><div class="code">${DIS[G.disSel]}</div></div>`;
    $$('[data-fn]', b).forEach(x => x.onclick = () => { G.disSel = x.dataset.fn; renderDis(b); });
  }

  /* ---------- Terminal ---------- */
  function normDom(s) { return String(s || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[\/?#].*$/, '').replace(/:\d+$/, '').replace(/^www\./, '').replace(/\.$/, ''); }
  function resolve(d) { const o = G.owned[d]; if (o) return o.dns || null; return KNOWN[d] || null; }
  function termCmd(c) {
    if (!c) return [];
    const parts = c.split(/\s+/), cmd = parts[0].toLowerCase(), d = normDom(parts.slice(1).join(' '));
    switch (cmd) {
      case 'help': return ['Commands:', '  nslookup <domain>   look up a domain in DNS', '  whois <domain>      who registered a domain, if anyone', '  curl <url>          make an HTTP request', '  ping <host>         check whether a host answers', '  clear               clear the screen'];
      case 'clear': G.term = []; return [];
      case 'whoami': return ['analyst'];
      case 'date': return ['Fri May 12 ' + gameClock(true) + ' BST 2017'];
      case 'ls': return ['samples/'];
      case 'sudo': return ['Nice try.'];
      case 'nslookup': case 'dig': case 'host': {
        if (!d) return ['usage: nslookup <domain>'];
        const a = resolve(d);
        return a ? ['Server:   192.168.1.1', 'Non-authoritative answer:', 'Name:     ' + d, 'Address:  ' + a] : ['Server:   192.168.1.1', `** server can't find ${d}: NXDOMAIN`];
      }
      case 'whois': {
        if (!d) return ['usage: whois <domain>'];
        if (G.owned[d]) return ['Domain Name: ' + d.toUpperCase(), 'Registrar: DomainDepot', 'Creation Date: 2017-05-12', 'Registrant: MalwareTech', 'Name Server: NS1.DOMAINDEPOT.EXAMPLE'];
        if (KNOWN[d]) return ['Domain Name: ' + d.toUpperCase(), 'Registrar: (registered)', 'Status: active'];
        return [`No match for domain "${d.toUpperCase()}".`, '>>> This domain is not registered. Anyone can buy it. <<<'];
      }
      case 'curl': case 'wget': {
        if (!d) return ['usage: curl <url>'];
        const a = resolve(d);
        if (!a) return [`curl: (6) Could not resolve host: ${d}`];
        if (a === SINK) return ['HTTP/1.1 200 OK', 'Server: sinkhole-01', '', 'sinkholed by MalwareTech'];
        if (KNOWN[d]) return ['HTTP/1.1 200 OK', '(page content omitted)'];
        return [`curl: (28) Failed to connect to ${d} (${a}) port 80: Connection timed out`];
      }
      case 'ping': {
        if (!d) return ['usage: ping <host>'];
        const a = /^\d+\.\d+\.\d+\.\d+$/.test(d) ? d : resolve(d);
        if (!a) return [`ping: cannot resolve ${d}: Unknown host`];
        if (a === SINK || KNOWN[d]) return [`PING ${d} (${a}): 56 data bytes`, `64 bytes from ${a}: icmp_seq=0 ttl=52 time=24.1 ms`, `64 bytes from ${a}: icmp_seq=1 ttl=52 time=23.8 ms`];
        return [`PING ${d} (${a}): 56 data bytes`, 'Request timeout for icmp_seq 0', 'Request timeout for icmp_seq 1'];
      }
      default: return [`${parts[0]}: command not found. Type "help".`];
    }
  }
  function renderTerm(b) {
    b.innerHTML = `<div class="term"><div class="term-out"></div><form class="term-line"><label class="prompt" for="termIn">analyst@mt-ws:~$</label><input id="termIn" autocomplete="off" spellcheck="false" autocapitalize="off"></form></div>`;
    const out = b.querySelector('.term-out'), f = b.querySelector('form'), inp = f.querySelector('input');
    const paint = () => { out.textContent = G.term.join('\n'); out.scrollTop = out.scrollHeight; };
    paint();
    f.onsubmit = e => {
      e.preventDefault();
      const c = inp.value.trim(); inp.value = '';
      G.term.push('analyst@mt-ws:~$ ' + c);
      const res = termCmd(c);
      if (c.split(/\s+/)[0].toLowerCase() !== 'clear') G.term.push(...res);
      paint();
    };
    b.addEventListener('click', () => { if (!String(getSelection())) inp.focus(); });
    setTimeout(() => inp.focus(), 0);
  }

  /* ---------- Browser: DomainDepot registrar ---------- */
  const validIp = s => /^(\d{1,3})(\.\d{1,3}){3}$/.test(s) && s.split('.').every(n => +n <= 255);
  function renderBr() {
    const b = G.brBody; if (!b) return;
    const res = G.ddRes, owned = Object.entries(G.owned);
    let resHtml = '';
    if (res) {
      const d = res;
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) resHtml = `<div class="result"><span class="err">"${esc(d)}" isn't a valid domain. Try something like example.com</span></div>`;
      else if (G.owned[d]) resHtml = `<div class="result"><span class="dn">${esc(d)}</span><span class="avail">You own this domain</span></div>`;
      else if (KNOWN[d]) resHtml = `<div class="result"><span class="dn">${esc(d)}</span><span class="taken">Taken</span></div>`;
      else if (G.ddCheckout === d) resHtml = `<div class="result"><span class="dn">Checkout: ${esc(d)}<br><span class="note">1 year registration</span></span><span class="price">$10.69</span><button class="act" data-buy="${esc(d)}">Confirm purchase</button><button class="act alt" data-cancel>Cancel</button></div>`;
      else resHtml = `<div class="result"><span class="dn">${esc(d)}</span><span class="avail">Available</span><span class="price">$10.69/yr</span><button class="act" data-reg="${esc(d)}">Register</button></div>`;
    }
    b.innerHTML = `<div class="br"><div class="br-bar"><span aria-hidden="true">◀ ▶ ⟳</span><div class="br-url">https://www.domaindepot.example/${res ? 'search?q=' + esc(encodeURIComponent(res)) : ''}</div></div>
    <div class="dd"><div class="dd-logo">Domain<span>Depot</span></div><p class="tag">Find your perfect domain. (A made-up registrar for this workshop.)</p>
    <form class="dd-search"><label class="sr" for="ddq">Domain name to search</label><input id="ddq" value="${esc(G.ddQ)}" placeholder="example.com" autocomplete="off" spellcheck="false" autocapitalize="off"><button class="act">Search</button></form>
    ${resHtml}
    ${owned.length ? `<section class="mydomains"><h4>My domains</h4>${owned.map(([d, o], i) => `<div class="mydom"><div class="dn">${esc(d)}</div><form class="dns-row" data-d="${esc(d)}"><label for="dns${i}">A record (IPv4)</label><input id="dns${i}" value="${esc(o.dns || '')}" placeholder="e.g. 198.51.100.7" autocomplete="off" spellcheck="false"><button class="act">Save DNS</button></form>${G.ddErr[d] ? `<p class="err">${G.ddErr[d]}</p>` : ''}<p class="note">${o.dns ? 'DNS: points to ' + esc(o.dns) : 'No DNS records yet, so this domain does not resolve to anything.'}</p></div>`).join('')}<p class="note">Spent so far: $${(owned.length * 10.69).toFixed(2)}</p></section>` : ''}
    </div></div>`;
    b.querySelector('.dd-search').onsubmit = e => { e.preventDefault(); G.ddQ = e.target.querySelector('input').value; const d = normDom(G.ddQ); G.ddRes = d || null; G.ddCheckout = null; renderBr(); };
    const reg = b.querySelector('[data-reg]'); if (reg) reg.onclick = () => { G.ddCheckout = reg.dataset.reg; renderBr(); };
    const can = b.querySelector('[data-cancel]'); if (can) can.onclick = () => { G.ddCheckout = null; renderBr(); };
    const buy = b.querySelector('[data-buy]'); if (buy) buy.onclick = () => {
      const d = buy.dataset.buy; G.owned[d] = { dns: null }; G.ddCheckout = null; renderBr();
      toast('DomainDepot', `You registered <span class="mono">${esc(d)}</span>. Add an A record so it points somewhere.`, 'good');
      if (d !== DOMAIN && Object.keys(G.owned).length === 2) later(2500, () => toast('Your bank', 'Card payment $10.69 to DOMAINDEPOT. Hopefully that one was worth it.'));
    };
    $$('.dns-row', b).forEach(f => f.onsubmit = e => {
      e.preventDefault(); const d = f.dataset.d, v = f.querySelector('input').value.trim();
      if (!validIp(v)) { G.ddErr[d] = 'Enter an IPv4 address like 198.51.100.7'; renderBr(); return; }
      G.ddErr[d] = ''; const prev = G.owned[d].dns; G.owned[d].dns = v; renderBr();
      if (d === DOMAIN && prev !== v) onTargetDns(v);
    });
  }
  function onTargetDns(ip) {
    if (ip === SINK) {
      if (G.sinkLive) return; G.sinkLive = true;
      later(2500, () => { toast('sinkhole-01', 'Traffic alert: thousands of new IP addresses per second are requesting <span class="mono">www.iuqerf…gwea.com</span>.', 'good', () => openApp('monitor')); G.news.unshift({ good: true, t: 'Researchers report a sudden drop in new WannaCry infections' }); });
      later(7500, () => {
        if (G.won) return;
        G.mailExtra.unshift({ id: 'm4', from: 'Colleague', subj: 'What did you just do??', time: gameClock(), body: '<p>Our feeds show new infections dropping off a cliff, and every infected IP is now calling your sinkhole.</p><p>Revert the snapshot and detonate the sample in the sandbox again. I want to know what that domain does.</p>' });
        renderMail();
        toast('Mail', 'Colleague: "What did you just do?? Detonate the sample again."', '', () => { G.mailSel = 'm4'; openApp('mail'); renderMail(); });
      });
    } else {
      G.sinkLive = false;
      later(4000, () => !ksOn() && toast('sinkhole-01', 'Still 0 requests. The domain resolves, but not to this server. Check the IP.', 'bad'));
    }
  }

  /* ---------- Outbreak monitor ---------- */
  function renderMon(full) {
    const b = G.monBody; if (!b) return;
    if (full || !b.querySelector('.mon')) {
      b.innerHTML = `<div class="mon"><div class="tiles"><div class="tile"><small>Hosts encrypted</small><div class="v red" data-v="inf"></div></div><div class="tile"><small>New per min</small><div class="v" data-v="rate"></div></div><div class="tile"><small>Countries</small><div class="v" data-v="cty"></div></div><div class="tile"><small>Sinkhole hits/s</small><div class="v" data-v="sink"></div></div></div>
      <div class="chartwrap"><small>New infections per minute, last 60 s</small><canvas class="spark" role="img" aria-label="New infections per minute over the last minute"></canvas></div>
      <div class="ticker"></div><p class="fine">Figures in this game are simulated.</p></div>`;
    }
    const on = ksOn(), last = G.rateHist[G.rateHist.length - 1] || 0;
    b.querySelector('[data-v=inf]').textContent = Math.round(G.infected).toLocaleString('en-GB');
    const rv = b.querySelector('[data-v=rate]'); rv.textContent = last.toLocaleString('en-GB'); rv.className = 'v ' + (on ? 'green' : 'red');
    b.querySelector('[data-v=cty]').textContent = G.countries;
    const sv = b.querySelector('[data-v=sink]'); sv.textContent = G.sinkHits.toLocaleString('en-GB'); sv.className = 'v ' + (G.sinkHits ? 'green' : '');
    b.querySelector('.ticker').innerHTML = G.news.slice(0, 6).map(n => typeof n === 'string' ? `<div>${esc(n)}</div>` : `<div class="goodnews">${esc(n.t)}</div>`).join('');
    drawSpark(b.querySelector('canvas'), on);
  }
  function drawSpark(cv, on) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const max = 3600, pad = 8, top = 16;
    c.strokeStyle = 'rgba(138,154,182,.15)'; c.lineWidth = 1;
    [0, .5, 1].forEach(f => { const y = Math.round(h - pad - (h - pad - top) * f) + .5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); });
    c.fillStyle = '#8a9ab6'; c.font = '10px "IBM Plex Mono",monospace'; c.fillText('3,600/min', 6, 11);
    const d = G.rateHist.slice(-60); if (d.length < 2) return;
    const X = i => 2 + (i + 60 - d.length) / 59 * (w - 4), Y = v => h - pad - (Math.min(v, max) / max) * (h - pad - top);
    const col = on ? '#37d39a' : '#ff5446';
    c.beginPath(); d.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)));
    c.lineTo(X(d.length - 1), h - pad); c.lineTo(X(0), h - pad); c.closePath();
    c.fillStyle = on ? 'rgba(55,211,154,.14)' : 'rgba(255,84,70,.14)'; c.fill();
    c.beginPath(); d.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)));
    c.strokeStyle = col; c.lineWidth = 2; c.stroke();
    const lx = X(d.length - 1), ly = Y(d[d.length - 1]); c.beginPath(); c.arc(lx, ly, 3.5, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  }

  /* ---------- level definition ---------- */
  window.KS.engine.run({
    id: 1,
    objective: 'Stop WannaCry from infecting more machines',
    mode: window.KS.desktop.mode({
      clock: { start: [14, 47], speed: 6, date: '12/05/2017' },
      icons: [['mail', 'Mail'], ['samples', 'samples'], ['sandbox', 'Sandbox VM'], ['disasm', 'Disassembler'], ['terminal', 'Terminal'], ['browser', 'Browser'], ['monitor', 'Outbreak monitor'], ['bin', 'Recycle Bin']],
      apps: {
        mail: { title: 'Mail', w: 740, h: 440, mount(b) { G.mailBody = b; renderMail(); }, unmount() { G.mailBody = null; } },
        samples: { title: 'samples', w: 540, h: 340, mount(b) { G.folderBody = b; renderFolder(); }, unmount() { G.folderBody = null; } },
        sandbox: { title: 'Sandbox VM: clean-win7-x86', w: 860, h: 440, dark: true, mount(b) { G.sbxBody = b; renderSbx(); }, unmount() { G.sbxBody = null; } },
        disasm: { title: 'Disassembler: wcry_sample.exe', w: 790, h: 470, dark: true, mount(b) { renderDis(b); } },
        terminal: { title: 'Terminal', w: 660, h: 360, dark: true, mount(b) { renderTerm(b); } },
        browser: { title: 'Browser', w: 720, h: 500, mount(b) { G.brBody = b; renderBr(); }, unmount() { G.brBody = null; } },
        monitor: { title: 'Outbreak monitor', w: 560, h: 480, dark: true, mount(b) { G.monBody = b; renderMon(true); }, unmount() { G.monBody = null; } },
        bin: { title: 'Recycle Bin', w: 380, h: 200, mount(b) { b.innerHTML = '<p class="note" style="padding:18px">Empty. Like your weekend plans now.</p>'; } },
      },
    }),
    hints: [
      'Start like a real analyst. Read the sticky note, and open the README in the samples folder. Never run the sample on this workstation.',
      'Detonate the sample in the Sandbox VM and read the packet capture from the top. One request happens before any SMB traffic. Does that domain exist? Try <span class="mono">nslookup</span> or <span class="mono">whois</span> in the Terminal.',
      'WannaCry only encrypts if its request to <span class="mono">www.iuqerfsodp9…wergwea.com</span> fails. Register that domain in the Browser, set its A record to your sinkhole IP from the sticky note, then detonate the sample again.',
    ],
    newState,
    onStart,
    onTick,
    win: {
      label: g => `Kill switch confirmed · ${g.winClock}`,
      html: '<h2>WannaCry asks one question first</h2><p>Before doing anything, it asks: does this nonsense domain answer? Until now the answer was no, so it encrypted and spread. Now your sinkhole answers, so every new infection quits on the spot.</p>',
    },
    debrief: {
      title: g => `You stopped WannaCry at ${g.winClock}`,
      stats: g => [['Your time', window.KS.fmt(g.endEl)], ['Hints used', g.hints], ['Own PC infected', g.hostRuns], ['Sandbox runs', g.sbxRuns]],
      quiz: [
        { q: 'Why did registering the domain stop WannaCry?', o: ['It took the attackers\' command server offline', 'The malware quits if a request to that domain succeeds', 'It sent everyone the decryption key', 'It patched SMBv1 on infected machines'], a: 1, why: 'The domain was a kill switch inside the code: if InternetOpenUrlA succeeds, WinMain returns before the payload runs.' },
        { q: 'A hospital PC was encrypted at 11:00. The kill switch went live at 15:00. What happened to its files?', o: ['They were decrypted automatically', 'They stayed encrypted', 'They were deleted', 'They were restored from the sinkhole'], a: 1, why: 'The kill switch only stops new detonations. Encrypted files stay encrypted; recovery means backups or paying, and paying gives no guarantee.' },
        { q: 'What would have prevented most infections in the first place?', o: ['Paying the ransom quickly', 'Installing MS17-010 and disabling SMBv1', 'A faster internet connection', 'Turning off DNS'], a: 1, why: 'The patch had been out for two months. Unpatched SMBv1 on port 445 was the way in.' },
        { q: 'Why do researchers register unknown domains found in malware?', o: ['To sell them back to the attackers', 'To sinkhole the traffic and count infected machines', 'Because it is required by law', 'To get the malware\'s source code'], a: 1, why: 'A sinkhole logs every infected host that calls home, which gives researchers a live map of the outbreak.' },
      ],
    },
  });
})();
