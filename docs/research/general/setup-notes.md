- The game is run in browser (HTML, CSS, light JavaScript)
- Every level has its folder
- Can be served by a Docker image (nginx:alpine with the file copied in). Players just open a URL; nothing gets installed on their machines.
- The four screens: 
    1. Hub: the level cards, keyword unlock and progress.
    2. Briefing: the case file you read before starting.
    3. Level: the playable workstation.
    4. Debrief: stats, what really happened, the quiz and sources
- Each level in the LEVELS list stores its keyword as a hash, not as plain text. When a player types a keyword, it’s hashed (capitals and spaces are ignored) and compared to the stored one. Viewing the page source won’t give away “ETERNALBLUE”.
- Progress (which levels are unlocked, plus best time and hints used) is saved in the browser’s localStorage. So it’s per person, per browser. Nothing is sent anywhere, and you get no shared scoreboard.
