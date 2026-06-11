# Chaos Survivor 🎯☢️

A creative, on-theme random winner picker for the **LitmusChaos** project pavilion
booth at **KubeCon India**. Names become **pods** in a Kubernetes cluster; a chaos
experiment terminates them one by one until a single **resilient survivor**
remains — your winner. _Only the resilient survive chaos._

Fully offline. No database, no API calls. Data is parsed in the browser and kept
in `localStorage`.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL on the booth display (use the browser's full-screen mode, F11).

## How it works

1. **Collect** entries via your Google Form (QR at the booth).
2. **Export** the responses as CSV or XLSX.
3. **Upload** the file in the app. It auto-detects the name column
   (`Full Name`, `Name`, `Your Name`, …). If it can't, you pick the column from a
   dropdown. Names are trimmed and **de-duplicated**.
4. **Inject Chaos** — pods get terminated (`Running → Terminating → CrashLoopBackOff`)
   until the last pod standing is revealed as **Winner #1** with confetti.
5. If that person isn't at the booth, hit **Next Winner** — their pod fails over and
   the **next most resilient survivor** is revealed. Repeat as needed.

A `sample-participants.csv` is included for testing.

## Controls

| Key / Button       | Action                                  |
| ------------------ | --------------------------------------- |
| `Space` / ☢ Inject | Run the chaos experiment (first draw)   |
| `N` / Next Winner  | Reveal the next survivor (winner absent)|
| `Esc`              | Dismiss the winner overlay              |
| 🔊 / 🔇            | Toggle sound effects                    |
| Reset              | Clear all data (names + winner log)     |

## Notes

- The draw is **deterministic per seed** (stored in `localStorage`), so a mid-booth
  page refresh restores the exact same state and ranking.
- The LitmusChaos mascot lives at `public/mascot.png` — swap that file to update it.
- GitHub-star / YouTube-subscribe checks are honor-system fields in your form
  (subscriptions can't be verified via API).

## Tech

Vite · React · Tailwind CSS v4 · Framer Motion · canvas-confetti · PapaParse · SheetJS
