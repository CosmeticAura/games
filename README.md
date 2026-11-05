# Games

Small browser games by CosmeticAura. They run on phones and laptops, need no install, and save your progress on your own device.

**Play: https://cosmeticaura.github.io/games/**

| Game | What it is |
| --- | --- |
| [Freefall](https://cosmeticaura.github.io/games/freefall/) | Jump from a height you can't see and open your chute as late as you dare. The multiplier climbs all the way down, and a crash costs your whole bet. Play tokens only. |

## Controls

Space or tap to open the chute, arrow keys or swipe to drift.

## Run it yourself

Each game is plain HTML and JavaScript with no build step. Clone the repo and serve the folder:

```
git clone https://github.com/CosmeticAura/games.git
cd games
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Layout

```
index.html     the game list
games.json     titles and descriptions shown on the list
freefall/      one folder per game
```

## License

MIT, see [LICENSE](LICENSE).
