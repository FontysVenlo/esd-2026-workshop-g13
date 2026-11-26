# Level designs

One section per level: what the player does, how they win and what the debrief says. Research behind each case is in [docs/research/malware-types/](../research/malware-types/).

| # | Case | Status |
|---|---|---|
| 1 | WannaCry | Built: [game/levels/01-ransomware/](../../game/levels/01-ransomware/) |
| 2 | Emotet | Designed below, not built yet |

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
* **Macro viewer.** The safe way is to open the document's macro instead of running it. The simplified macro viewer shows what the document really does and reveals the list of server addresses the malware talks to.

What the player learns: the document is the trojan. It does nothing until the reader lets it.

### Part 2: the botnet map

A map with three columns: infected PCs, a first layer of servers, then backend servers.

* The player marks servers for seizure and then starts one coordinated action.
* Every server from the macro's list has to be in that action.
* **If one is missed:** the infected PCs switch to it, the criminals keep control and send out a new list. Time penalty, and the action has to be done again.
* The map also holds servers that aren't in the list. Seizing one of those takes an innocent website offline: time penalty.
* Seizing the first layer shows where it passes its traffic on to: the backend servers. They have to be taken in the same action.

What the player learns: a botnet has no single off switch. Every infected PC knows several servers, so the takedown only works if all of them go at once.

### Part 3: the last update

With the servers in police hands, every infected PC now asks the police for its next update. The player picks one of three options:

| Option | Result |
|---|---|
| Delete everything now | Wrong. The evidence is lost and victims never find out they were infected |
| Do nothing | Wrong. The PCs stay infected and wait for whoever controls the servers next |
| Cut the PCs off from the criminals, schedule the uninstall for 25 April 2021 and warn victims | Correct |

A wrong choice shows why it's wrong, costs time, and the player chooses again.

### Hints

1. The email looks fine. The attachment is the problem: look at what it does without running it.
2. The macro lists the addresses the malware calls. Every one of them has to be in your action, and nothing else.
3. Mark exactly the servers from the list and the backend servers behind them, then pick the option that keeps the evidence and warns the victims.

### Debrief

* **What stays on the PCs:** the other malware Emotet installed (TrickBot, Qakbot, Ryuk). The update only removed Emotet.
* **Warning victims:** the Dutch police site where people could check their email address against the stolen data.
* **It came back:** Emotet returned in November 2021.
* **The method was reused:** Qakbot was taken down the same way in 2023.

Stats shown: time, hints used, servers seized, wrong moves.

Quiz ideas:

1. Why did the email look trustworthy? (It was a reply inside a real, stolen conversation.)
2. Why did the police have to seize all servers at the same time? (Infected PCs switch to any server that's left.)
3. What did the uninstall on 25 April not fix? (Other malware that came in through Emotet, and stolen passwords.)

Discussion question: the police changed software on more than a million privately owned computers without asking the owners. Was that right? Where is the line?

### Where the game simplifies

| In the game | In reality |
|---|---|
| The macro shows the control server list | The macro only downloaded the Emotet program. The control server list was inside that program |
| One short list of servers | Several hundred servers in three separate botnets, with lists that changed all the time |
| The player schedules the uninstall | The Dutch police took over the main servers in the Netherlands. The uninstall update was made and sent by the German BKA |
| The case takes a few minutes | A long international investigation led up to one action week |

The debrief should mention the first three.

### Open points

* Unlock keyword for the hub (said at the end of the mini-lecture).
* In-game date. The real takeover was on 26 January 2021 and was announced on the 27th. `Invoice_0127.doc` reads like 27 January.
* Size of the time penalties (level 1 uses +2:00 for its trap).
