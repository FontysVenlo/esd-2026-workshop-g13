# Kill Switch: malware workshop

> Every malware type is a level. Learn how it works, then stop a real outbreak yourself.

**Kill Switch** is an interactive 90-minute workshop on malware and its main types, built for the *Enterprise Software Development* (ESD) course. It runs as a browser game. Each level starts with a short mini-lecture and then puts players against a famous real-world malware case.

(START PLAYING INSTRUCTIONS)

---

## How the workshop works

1. **Mini-lecture.** We introduce one malware type: how it spreads, what it does, and why it matters for enterprise systems.
2. **Keyword.** The lecture ends with a keyword. Typing it in the game unlocks that level.
3. **Play.** Players get into a designated level.
4. **Debrief.** Each level ends with what really happened, what fixed it, a short quiz and a discussion question.

Progress is saved in each player's own browser, so a page refresh doesn't lose anything.

## Levels

| # | Malware type | Real case 
|---|---|---|
| 1 | Ransomware / worm | WannaCry (2017): find and trigger the kill switch | 
| 2 | Trojan / botnet | Emotet (2021): seize every server of the botnet, then choose its last update (in development) | 
| 3 | _TBD_ | _TBD_ | 
| 4 | _TBD_ | _TBD_ | 
| 5 | _TBD_ | _TBD_ | 

Level designs are in [docs/design/ideas.md](docs/design/ideas.md). The research behind each case is in [docs/research/malware-types/](docs/research/malware-types/).

## Safety disclaimer

Nothing in this project is real malware. All "samples", networks and infections are simulated in JavaScript inside the page. Nothing is downloaded or executed, and nothing leaves the browser. The game teaches how attacks work and how they were stopped, not how to build them.

## Running it locally

The game is plain HTML, CSS and JavaScript. Nothing needs to be installed or built.

- **With a local server** (recommended): run `python -m http.server 8000` inside the `game` folder and open http://localhost:8000.
- **Without a server:** open `game/index.html` in Chrome or Edge. Other browsers may not keep the unlocked levels between pages when the game is opened as a file.

Each level is locked until its keyword is typed on the hub. To skip the keyword while developing, open the level page directly with `?dev` at the end, for example `game/levels/01-ransomware/index.html?dev`.

## Repository structure

```
game/
  index.html              hub: level cards, keyword unlock, progress
  shared/                 code and styles every level uses (core, engine, hub, desktop mode)
  levels/01-ransomware/   level 1: WannaCry
docs/
  design/ideas.md         level designs
  research/general/       notes on how the game is set up
  research/malware-types/ one folder per malware type:
                          main-cases.md (cases we considered) and one file per chosen case
slides/                   notes for the mini-lectures
```

