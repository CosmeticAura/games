# Casino handoff (updated 2026-11-06, from the AI Optimize chat)

Read this first in any new casino chat. Then read the files it points to; don't redo what's listed as done.

## What it is
Hector's browser casino of small games, play tokens only, one shared profile, wallet, shop and theme across every game. First and only game so far: Freefall (jump from a hidden height, a risk based multiplier climbs, open your parasol before the ground, bots jump with you).

## Where things are
- Live site: https://cosmeticaura.github.io/games/ (Freefall at /freefall/). Public repo CosmeticAura/games, local clone `~/AI Everything/🎮 Games site/`. Publish a game with `publish.sh <slug> ["Title" "description" tags]`; it also copies `Playground/shared/`. Commits are authored as Hector Gaffinel, no Claude credit anywhere.
- Source: `~/AI Everything/Playground/freefall/` (V4_BRIEF.md is the current spec, ART.md, SOUNDS.md, V2_HANDOFF.md) and `~/AI Everything/Playground/shared/` (ECONOMY.md: faucets, sinks, levels, shop catalog of 150+ items, game ideas ranked; LESSONS.md: playtest lessons).
- Hermes skill `~/.hermes/skills/hector/casino-game-design/SKILL.md`: the design guide (loop, bots with 8 personalities, motion timings, color, features) plus the self improvement loop (lessons into LESSONS.md after every task, fold repeats into the skill).
- Design canvas (claude.ai): "Freefall UI" https://claude.ai/artifact/BYPeWAwsisJrFnvxxVmQqs. Hector picked A "Ink night" (night rain, red ground glow, gold altimeter ruler, huge orange meters number, parasol chutes, green Safe stamps). B Cockpit dusk and C Two-ink print became buyable themes. The canvas also has the interface shop screen.
- Rules for the bots: `~/AI Everything/🤖 AI & Agents/Hermes setup/ASK_FROM_ANYWHERE.md` (quick lane, publish games with publish.sh, text the https github.io link).

## Status
- PAUSED by Hector on 2026-11-05 so the Cosmetics loop gets the weekly budget. Then he changed his mind: Atlas finishes the v5 polish step it was on, publishes it with publish.sh, saves notes to Playground/freefall, and starts nothing else on the casino until Hector says go.
- Live and published: v4 plus fixes (last site commit a4f18a9 "Update freefall"; Playground/freefall files last changed 2026-11-05 21:35). v4 = accounts with avatars, saving fix, reset to 0 with daily 10,000, risk based multiplier with 8% edge, varied round heights, auto spectate, crash ends your round at once, round ends when the last free faller lands, right panel with round leaderboard and diver preview, new sounds, Ink night look, themes.js, interface shop, shared casino modules.
- v5 polish (asked of Atlas): smooth snap scrolling for faces and cosmetics, smooth round end transition (no instant menu), more fall and UI animation, bot personality system, apply the whole casino-game-design skill. Not confirmed finished. First step in a new chat: compare `git log` in this folder and the newest files in Playground/freefall against the list above, run the tests in Playground/freefall/tests and Playground/shared/tests, then open the live site and check each v5 item by eye.
- Tapper was removed. Freefall is the only game.

## Next (only after Hector says go)
1. Playtest v5, turn feedback into a short message for Atlas and a LESSONS.md line.
2. New games in order: Mines, Plinko, Blackjack, Lantern race (details in ECONOMY.md section 7), then a casino lobby page once there are two games.
3. Keep every game on the shared modules (profile.js, wallet.js, shop.js, themes.js, catalog.json) so tokens, cosmetics and themes carry over.

## Disk
The Mac mini is short on space (about 30 GB free). This project is small (Playground 12 MB, site clone 20 MB), so keep it local. Do not add large video or audio files here.

## How Hector works here
- He texts Atlas (iMessage, contact named "Claude") or the chat gives him a paste ready message. Keep messages short and point Atlas at files instead of pasting long briefs; Atlas's long sessions fill up fast.
- Mind the weekly budget: `python3 ~/.hermes/bin/budget.py` (works from the Cowork shell too). Never pass 90% at the Thursday 8 PM reset.
- He reads chat replies only for what to do next; keep them short. Humanize all text. No dashes.
