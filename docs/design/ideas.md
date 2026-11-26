# Level designs

One section per level: what the player does, how they win and what the debrief says. Research behind each case is in [docs/research/malware-types/](../research/malware-types/).

| # | Case | Status |
|---|---|---|
| 1 | WannaCry | Built: [game/levels/01-ransomware/](../../game/levels/01-ransomware/), design below |
| 2 | Emotet | Built: [game/levels/02-trojan/](../../game/levels/02-trojan/), design below |

## Level 1: WannaCry (2017, the kill switch)

**Type:** Ransomware / worm \
**Player:** Marcus Hutchins (MalwareTech), a 22-year-old malware researcher on a week off \
**Objective:** stop WannaCry from infecting more machines \
**Research:** [wannacry.md](../research/malware-types/ransomware/wannacry.md)

The level has three parts. Each one teaches one thing about this ransomware: it spreads by itself, it asks one question before it does anything, and that question can be answered by anyone.

### Part 1: the sample

The player starts on Marcus's workstation on 12 May 2017, while the outbreak is running.

* **Mail.** A fellow researcher has sent a live sample (`wcry_sample.exe`, in the samples folder). A news alert describes the hospitals being hit. A third mail from the hosting provider gives the address of Marcus's own sinkhole server.
* **Sticky note.** Marcus's routine for new samples: never run it on this machine, use the sandbox, read the code, and register strange unregistered domains to track infections. It also holds the sinkhole address.
* **Outbreak monitor.** Live counters (hosts encrypted, new infections per minute, countries), a graph and a news ticker. They keep climbing while the player works.
* **Trap.** Running the sample from the samples folder on the workstation shows the ransom note. The player restores a backup and gets a time penalty.

What the player learns: a live sample is only opened in an isolated machine.

### Part 2: what it does first

* **Sandbox VM.** The player detonates the sample and reads the packet capture. Before any other traffic, the sample asks DNS for one long nonsense domain and gets "does not exist". Only then does it install itself, scan port 445 and encrypt the VM.
* **Disassembler.** The code shows the same thing: `WinMain` requests that domain and returns at once if the request succeeds. Everything else (install, encrypt, spread) only runs if it fails. The other functions show the worm: scanning the local network and random internet addresses for port 445 and attacking with EternalBlue.
* **Terminal.** `nslookup`, `whois`, `curl` and `ping` let the player check the domain. `whois` says nobody has registered it and anyone can buy it.

What the player learns: the malware checks a domain before it acts, and that domain is free.

### Part 3: the kill switch

* **Browser.** A made-up registrar, DomainDepot. The player searches for the domain, registers it for $10.69 and sets its A record to the sinkhole address.
* If the address is wrong, the sinkhole reports that it still gets no requests.
* With the right address, the sinkhole reports thousands of requests per second, the monitor shows new infections dropping, and a colleague writes: what did you just do, detonate the sample again.
* **Win.** The player detonates the sample in the sandbox once more. This time the domain answers and the sample quits without encrypting anything.

What the player learns: registering one domain stopped every new infection, and the person who did it only found out afterwards.

### Hints

1. Start like a real analyst: read the sticky note and the README in the samples folder, and never run the sample on the workstation.
2. Detonate the sample in the Sandbox VM and read the packet capture from the top. One request happens before any other traffic. Check that domain with `nslookup` or `whois`.
3. Register the domain in the Browser, set its A record to the sinkhole address from the sticky note, then detonate the sample again.

### Debrief

* **What really happened:** Hutchins registered the domain as routine tracking and only then realised it was a kill switch.
* **Why build a kill switch:** probably a trick against analysis, because many sandboxes answer every web request.
* **What it didn't fix:** machines that were already encrypted, PCs behind proxies, and copycat versions with another domain or none.
* **The real fix:** install the MS17-010 patch, switch off SMBv1, block port 445 and keep offline backups.
* **Who was behind it:** the Lazarus Group, linked to North Korea.

Stats shown: time, hints used, own PC infected, sandbox runs.

Quiz:

1. Why did registering the domain stop WannaCry? (The malware quits if a request to that domain succeeds.)
2. A hospital PC was encrypted before the kill switch went live. What happened to its files? (They stayed encrypted.)
3. What would have prevented most infections? (Installing MS17-010 and disabling SMBv1.)
4. Why do researchers register unknown domains found in malware? (To sinkhole the traffic and count infected machines.)

Discussion question: your company runs an unpatched Windows 7 PC that controls a production line, and the vendor says patching "voids support". It's Monday after WannaCry. What do you do?

### Where the game simplifies

| In the game | In reality |
|---|---|
| The player registers the domain to stop the outbreak | Hutchins registered it to track the outbreak. The kill-switch effect was discovered afterwards |
| Infections drop to almost zero | New encryptions stopped, but infected machines and later variants stayed |
| "DomainDepot" | Namecheap, same price |
| One sinkhole server | A sinkhole that soon came under attack from other botnets |
| Every PC can reach the domain | PCs behind a proxy could not, and kept encrypting |

The debrief mentions the first, second and last.

### As built

* Unlock keyword for the hub (said at the end of the mini-lecture): ETERNALBLUE.
* In-game date: 12 May 2017, starting at 14:47.
* Time penalty: +2:00 for running the sample on the workstation. Nothing else costs time.
* Buying other domains is possible and does nothing, apart from a comment from the bank.

## Level 2: Emotet (2021, Operation LadyBird)

**Type:** Trojan / botnet \
**Player:** an investigator on the Dutch police High Tech Crime team \
**Objective:** take the botnet away from the criminals and decide what happens to the infected PCs \
**Research:** [emotet.md](../research/malware-types/trojans/emotet.md)

The level has three parts. Each one teaches one thing about trojans: how they get in, how the botnet behind them stays alive, and why switching it off is a decision and not only a technical step.

### Part 1: the way in

The player starts on the team's workstation (the same desktop as level 1).

* **Mail.** A victim company has forwarded a suspicious email. It looks like a reply inside a real conversation: the earlier messages are quoted underneath and the sender is someone the victim knows. Attached: `Invoice_0127.doc`.
* **Document viewer.** Opening the attachment shows the "Enable content" trick: a blurred page with a notice that the document was made in an older version of Word and the reader must click "Enable content" to see it.
* **Trap.** Clicking "Enable content" on the workstation infects it. The player gets a time penalty and an explanation of what that click does.
* **Macro viewer.** The macro can be opened without running it, but it is scrambled, like the real ones. The player can see that it starts a hidden command and nothing more.
* **Sandbox VM.** The safe way is to let the document run in an isolated VM. Emotet installs itself there, and the police now have a bot of their own.
* **Terminal.** A shell inside the VM, like the terminal in level 1. `ps` lists the running programs, and one of them is unsigned and was started by Word. `dump <pid>` prints the readable text in that program's memory, which includes the list of servers the botnet uses right now. That list becomes the targets on the map, and it stays up to date because the bot gets every new list the operators send. Extra commands: `netstat` shows which server the bot is talking to, `decode Invoice_0127.doc` unscrambles the macro.

What the player learns: the document is the trojan. It does nothing until the reader lets it, and an infected PC always carries a list of servers.

### Part 2: the botnet map (live operation)

A map with three columns: infected PCs, a first layer of servers, then backend servers. This part runs in real time and can be lost.

* Every server needs a police team at its door. The player clicks a server to send its team.
* Teams need different times depending on the country (6 to 24 seconds).
* A team that has arrived can only wait 8 seconds, then it has to pull back and be sent again. Sending everyone at once therefore fails: the fast teams are gone before the slow ones arrive. The player has to send the slowest first and time the rest.
* The operators replace one server every 75 seconds. The countdown is on the map, and the team for a replaced server has to start from zero.
* **Strike:** one button. If every team is at the door, the first layer is seized.
* **If a team is missing:** the infected PCs fall back to the servers still standing and the operators replace the whole list. Time penalty, all teams back at base.
* **Backend:** seizing the first layer shows the three backend servers and starts a 45-second countdown, because the operators have noticed and are wiping them. Same timing game with three teams. If the time runs out or the strike is incomplete, the operators set up new relays and the whole operation starts again.

What the player learns: a botnet has no single off switch. Every infected PC knows several servers, so the takedown only works if all of them go at the same moment, and that is a coordination problem between countries.

### Part 3: the last update

With the servers in police hands, every infected PC now asks the police for its next update. A mail from the public prosecutor gives the deadline: on 25 April 2021 at 12:00 Emotet has to remove itself, not earlier and not later.

The update is shown as a short piece of C-style code with five boxes to fill in, then "Compile & send":

| Box | Options | Correct | Why the others are wrong |
|---|---|---|---|
| `C2_SERVERS` | OPERATORS / POLICE | POLICE | The PCs keep calling the old addresses, and the criminals only need one of them back |
| `NOTIFY_OWNERS` | false / true | true | Other malware and stolen passwords stay, and nobody knows to clean up |
| `REMOVE_OTHER_MALWARE` | false / true | false | The police may only touch what Emotet itself installed |
| `tm_mon` | a number | 3 | Months are counted from 0, so April is 3. Typing 4 gives 25 May |
| `tm_mday` | a number | 25 | Any other day misses the court's deadline. Today or earlier removes Emotet at once and the evidence is gone |

The month is the small code puzzle of the level, and it is real: the first researcher who read the police update saw month 3 and announced 25 March.

Empty boxes or impossible numbers give a compiler error and cost nothing. A wrong update shows the first thing that goes wrong with it, costs time, and the player changes the code and sends again.

### Hints

1. Never enable content on the workstation. Run the document in the Sandbox VM, then use the Terminal to read what Emotet keeps in memory: type `help`.
2. Every team needs a different time and can only wait 8 seconds at the door. Sending all at once doesn't work: start with the slowest.
3. The full path: `ps`, `dump 2284`, slowest team first, each other team when the slowest has as long left as that team needs, strike when all are at the door, the same for the backend, then POLICE, true, false, `tm_mon` 3, `tm_mday` 25.

### Debrief

* **What stays on the PCs:** the other malware Emotet installed (TrickBot, Qakbot, Ryuk). The update only removed Emotet.
* **Warning victims:** the Dutch police site where people could check their email address against the stolen data.
* **The month that starts at zero:** the date in the real police update and the researcher who first read it as 25 March.
* **It came back:** Emotet returned in November 2021.
* **The method was reused:** Qakbot was taken down the same way in 2023.

Stats shown: time, hints used, strikes called, wrong moves.

Quiz ideas:

1. Why did the email look trustworthy? (It was a reply inside a real, stolen conversation.)
2. Why did the police have to seize all servers at the same time? (Infected PCs switch to any server that's left.)
3. What did the uninstall on 25 April not fix? (Other malware that came in through Emotet, and stolen passwords.)

Discussion question: the police changed software on more than a million privately owned computers without asking the owners. Was that right? Where is the line?

### Where the game simplifies

| In the game | In reality |
|---|---|
| Teams need seconds and the operators change a server every 75 seconds | The preparation took a long investigation and the action a week |
| One short list of servers | Several hundred servers in three separate botnets, with lists that changed all the time |
| The player schedules the uninstall | The Dutch police took over the main servers in the Netherlands. The uninstall update was made and sent by the German BKA |

The debrief mentions all three, plus the limit the police had to keep to: only what Emotet's operators had installed.

### As built

* Unlock keyword for the hub (said at the end of the mini-lecture): LADYBIRD.
* In-game date: 26 January 2021, the day of the real takeover. It was announced on the 27th.
* Time penalties: +2:00 for clicking "Enable content" on the workstation, +1:00 for a strike with a team missing or a wrong update. Losing the backend costs no extra time, but the operation starts over.
* 6 relays and 3 backend servers. The numbers that set the difficulty (team times, the 8-second wait, the 75-second list change, the 45-second backend countdown) are constants at the top of `game/levels/02-trojan/level.js`.
* All addresses are made up per attempt from the ranges reserved for documentation.
