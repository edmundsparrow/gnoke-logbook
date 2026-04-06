# 📋 Gnoke Logbook

Log daily tasks, track progress, and export clean weekly reports — built for individuals and teams on active projects.

> **Portable. Private. Persistent.**

---

## Live Demo

**[edmundsparrow.github.io/gnoke-logbook](https://edmundsparrow.github.io/gnoke-logbook)**

---

## What It Does

- Create and manage multiple projects
- Log daily tasks across a full Mon–Sun week
- Mark tasks as done with a per-row checkbox
- Navigate between weeks — previous and future weeks are always accessible
- Customisable week checklist for quality and continuity tracking
- Export a clean weekly report as PDF (print dialog)
- Copy the week as plain text for WhatsApp or email
- Backup all data to a JSON file and restore anytime
- Dark / light theme toggle
- Works completely offline
- No account. No server. No tracking.

---

## Run Locally

```bash
git clone https://github.com/edmundsparrow/gnoke-logbook.git
cd gnoke-logbook
python -m http.server 8080
```

Open: **http://localhost:8080**

---

## Project Structure

```
gnoke-logbook/
├── index.html          ← Splash / intro screen
├── main/
│   └── index.html      ← Main app shell (clean URL: /main/)
├── js/
│   ├── state.js        ← App state (single source of truth)
│   ├── theme.js        ← Dark / light toggle
│   ├── ui.js           ← Toast, modal, status chip
│   ├── db.js           ← All data operations via localStorage
│   ├── export.js       ← PDF and plain text export
│   └── app.js          ← Bootstrap + event wiring
├── sw.js               ← Service worker (offline / PWA)
├── manifest.json       ← PWA manifest
├── global.png          ← App icon (192×192 and 512×512)
└── LICENSE
```

---

## Privacy & Tech

- **Stack:** Vanilla JS, localStorage — zero dependencies, no build step.
- **Privacy:** No tracking, no telemetry, no ads. Your data never leaves the device.
- **License:** GNU GPL v3.0

---

## Support

If this app saves you time, consider buying me a coffee:
**[selar.com/showlove/edmundsparrow](https://selar.com/showlove/edmundsparrow)**

---

© 2026 Edmund Sparrow — Gnoke Suite

