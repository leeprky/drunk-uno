# 🍻 Drunk Uno — Real-Time Multiplayer Web App

[![Live App](https://img.shields.io/badge/Live%20App-GitHub%20Pages-success.svg?style=for-the-badge&logo=github)](https://leeprky.github.io/drunk-uno/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **The Ultimate Uno Drinking Game & Live Party Scoreboard.**  
> A global real-time multiplayer party game where anyone can create a private room and play with their friends across smartphones. Featuring live multi-device MQTT WebSocket synchronization, authoritative server-retained persistence, dual play modes (Single Phone Console & Live Party Sync), interactive Wheel of Doom, drinking rules codex, and Party Bingo challenges.

---

## 🔗 Quick Access & Live Environments

Play immediately in your browser on desktop, tablet, iPhone, or Android:

| Environment | Branch | Description | Live URL |
| :--- | :---: | :--- | :--- |
| 🚀 **Live Production Site** | `main` | Official production release | **[https://leeprky.github.io/drunk-uno/](https://leeprky.github.io/drunk-uno/)** |
| 🌿 **Development Branch** | `dev` | Active development branch source | [View `dev` Branch](https://github.com/leeprky/drunk-uno/tree/dev) |

---

## ✨ Features

- **🏰 Global Multi-Room Private Hub**:
  - Anyone around the world can create or join their own private room using a unique Room Code.
  - Complete isolation — zero interference between different games or friend groups.
- **🛡️ Authoritative Server-Retained Persistence & Zero Reversion**:
  - State is stored authoritatively on the MQTT broker.
  - Phones locking, sleeping, or reloading automatically fetch the live state — **never reverting scores back to old snapshots**.
- **⏳ Automatic Room Lifecycle & Expiration**:
  - Automatically purges inactive rooms after 30 minutes of idle time.
  - Displays a 5-minute warning banner with a "Keep Active" renewal button.
  - Completed games auto-delete after a 10-minute celebration window (or instantly via the Crawl Master "Finish & Delete Room Now" button).
- **🎮 Dual Play Modes**:
  - **📱 Single Phone Console**: One phone manages scores, drink penalties, wheel spins, and bingo for all 4 crews. Perfect for casual tabletop sessions.
  - **⚡ Live Party Sync**: Every player connects their own smartphone, registers their name, picks their crew, and referees rival teams in real time.
- **👑 Party Host & Crawl Master Admin Controls**:
  - Start / End Game lifecycle control.
  - Reset Room Scores to 0 without disconnecting players.
  - Instant room deletion and custom admin passcode changer.
  - Real-time connected device and IP directory with Kick & Ban.
- **🎡 Interactive Wheel of Doom**:
  - GSAP physics-driven roulette wheel with spring needle deflection, sound effects, and team penalties.
- **🎯 Uno Party Bingo & Drinking Codex**:
  - Official drinking card penalties (Draw 2, Wild Draw 4, Reverse bounce-backs, 7 Wild Heists) and live Party Bingo feats.
- **📲 PWA & Offline Support**:
  - Installable directly to your iOS or Android home screen with standalone mode and custom app icons.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 Glassmorphism, Modern JavaScript (ES2022)
- **Animation**: [GSAP 3](https://greensock.com/gsap/) with Power4 physics easing
- **Real-Time Sync**: MQTT over WebSockets via Paho JavaScript Client
- **Audio & Haptics**: Web Audio API synthesizer + Apple Taptic / Navigator Vibrate API
- **Hosting**: GitHub Pages

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
