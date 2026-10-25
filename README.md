# 🍻 Drunk Uno — Real-Time Multiplayer Web App

[![Live App](https://img.shields.io/badge/Live%20App-GitHub%20Pages-success.svg?style=for-the-badge&logo=github)](https://leeprky.github.io/drunk-uno/)
[![Dev Preview](https://img.shields.io/badge/Dev%20Preview-Staging-blueviolet.svg?style=for-the-badge&logo=github)](https://leeprky.github.io/projects/drunk-uno/)
[![Version](https://img.shields.io/badge/Version-v6.2-amber.svg?style=for-the-badge)](https://leeprky.github.io/drunk-uno/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **The Ultimate Uno Drinking Game & Live Party Scoreboard.**  
> Featuring private multi-room live synchronization, authoritative server-retained persistence, dual play modes (Single Phone Console & Live Party Sync), interactive Wheel of Doom, 10 Pub Crawl stops, and Uno Bingo feats & penalties.

---

## 🔗 Quick Access & Live Environments

Play immediately in your browser on desktop, tablet, iPhone, or Android:

| Environment | Branch | Description | Live URL |
| :--- | :---: | :--- | :--- |
| 🚀 **Production Site** | `main` | Official production release | **[https://leeprky.github.io/drunk-uno/](https://leeprky.github.io/drunk-uno/)** |
| 🧪 **Dev Preview** | `dev` | Active development preview | **[https://leeprky.github.io/projects/drunk-uno/](https://leeprky.github.io/projects/drunk-uno/)** |
| 🌿 **Dev Source Code** | `dev` | Development branch source code | [View `dev` Branch](https://github.com/leeprky/drunk-uno/tree/dev) |

---

## ✨ Features

- **🏰 Multi-Room Private Hub**:
  - Groups can join or create their own private rooms using a unique Room Code.
  - Zero interference between different parties or crawls.
- **⏳ Automatic Room Lifecycle & Expiration**:
  - Automatically purges inactive rooms after 30 minutes of idle time.
  - Displays a 5-minute warning banner with a "Keep Active" renewal button.
  - Completed crawls auto-delete after a 10-minute celebration window (or instantly via the Crawl Master "Finish & Delete Room Now" button).
  - Clears retained MQTT broker topics and resets connected devices cleanly.
- **🛡️ Authoritative Server-Retained Persistence**:
  - State is synchronized over MQTT WebSockets with server broker retention.
  - Phones locking, refreshing, or sleeping will **never revert scores back to 15 points**.
  - Monotonic conflict resolution and decoupled event streams.
- **🎮 Dual Play Modes**:
  - **📱 Single Phone Console**: One phone manages scores, drink penalties, wheel spins, and bingo for all 4 crews. Perfect for casual tabletop sessions.
  - **⚡ Live Party Sync**: Every player connects their own smartphone, registers their name, picks their crew, and referees rival teams in real time.
- **👑 Custom Crawl Master Admin Code**:
  - First player to create a room sets their own private Admin Passcode with instant unlock.
- **🎡 Interactive Wheel of Doom**:
  - GSAP physics-driven roulette wheel with spring needle deflection, sound effects, and team penalties.
- **🎯 10-Pub Crawl Route & Tactical Bingo**:
  - Live pub tracking, drink codex, secret bingo challenges, and instant win celebration podiums.
- **📲 PWA & Offline Support**:
  - Installable directly to your iOS or Android home screen with high-resolution app icons and standalone mode.

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
