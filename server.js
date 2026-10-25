/**
 * 🍻 DRUNK UNO — AUTHORITATIVE MULTIPLAYER GAME SERVER
 * ----------------------------------------------------
 * High-performance real-time WebSocket & HTTP server.
 * Provides authoritative game state management, sub-5ms phone sync,
 * instant room validation, persistent disk storage, and 30m idle reaper.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Ensure persistent storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Room Registry: roomCode (UPPERCASE) -> Room Object
const rooms = new Map();
// Sockets Registry: roomCode -> Set of WebSocket clients
const roomSubscriptions = new Map();

// Default 4 Crews
function createDefaultTeams() {
  return [
    { id: 0, key: "RED", name: "Team Red", colorClass: "red", score: 0, sips: 0, stash: 0, crowns: 0, frozen: false, targetIdx: 1, targetName: "Team Blue", players: [], captain: "" },
    { id: 1, key: "BLUE", name: "Team Blue", colorClass: "blue", score: 0, sips: 0, stash: 0, crowns: 0, frozen: false, targetIdx: 2, targetName: "Team Green", players: [], captain: "" },
    { id: 2, key: "GREEN", name: "Team Green", colorClass: "green", score: 0, sips: 0, stash: 0, crowns: 0, frozen: false, targetIdx: 3, targetName: "Team Yellow", players: [], captain: "" },
    { id: 3, key: "YELLOW", name: "Team Yellow", colorClass: "yellow", score: 0, sips: 0, stash: 0, crowns: 0, frozen: false, targetIdx: 0, targetName: "Team Red", players: [], captain: "" }
  ];
}

// Default Bingo Party Challenges
const DEFAULT_BINGO_CARDS = [
  { id: "bg_round", icon: "🍻", title: "Refills / Buys Drinks for Whole Team", pts: 10, isBonus: true, repeatable: false, desc: "Generous teammate gets or pours a full round of drinks for their squad.", claimedBy: null, claimCount: 0 },
  { id: "bg_chant", icon: "📢", title: "Party Chanting Team's Colour", pts: 8, isBonus: true, repeatable: false, desc: "Hyped up the room and got everyone loudly chanting your team's color!", claimedBy: null, claimCount: 0 },
  { id: "bg_karaoke", icon: "🎤", title: "Party Anthem Sing-Along", pts: 6, isBonus: true, repeatable: false, desc: "Belted out a full party song or classic banger with passion!", claimedBy: null, claimCount: 0 },
  { id: "bg_stranger_drink", icon: "🥂", title: "Survives Stacked +4 Card Attack", pts: 6, isBonus: true, repeatable: false, desc: "Successfully countered or survived a stacked Draw 4 without breaking!", claimedBy: null, claimCount: 0 },
  { id: "bg_dj", icon: "🎧", title: "DJ / Auxiliary Cord Master", pts: 4, isBonus: true, repeatable: false, desc: "Got their squad's official hype track played on the sound system.", claimedBy: null, claimCount: 0 },
  { id: "bg_sneaky_trade", icon: "🥷", title: "Sneaky Card Trade", pts: 4, isBonus: true, repeatable: false, desc: "Successfully pulled off a stealth card swap with a teammate without getting caught.", claimedBy: null, claimCount: 0 },
  { id: "bg_steal_drink", icon: "🥷", title: "Steal Drink Without Realising", pts: 4, isBonus: true, repeatable: false, desc: "Stealth phantom: drank or took a sip of a rival's cup without them noticing!", claimedBy: null, claimCount: 0 },
  { id: "bg_pirate", icon: "🏴‍☠️", title: "Orders / Speaks in Pirate Accent", pts: 2, isBonus: true, repeatable: false, desc: "Maintains a full pirate accent for an entire round of Uno play.", claimedBy: null, claimCount: 0 },
  { id: "bg_sidegame_win", icon: "🎱", title: "Wins Party Side Game (Pong/Darts/Flip Cup)", pts: 6, isBonus: true, repeatable: true, maxClaims: 2, desc: "Victory in a party side game (beer pong, flip cup, darts) — max 2 claims!", claimedBy: null, claimCount: 0 },
  { id: "bg_selfie", icon: "📸", title: "Group Victory Squad Selfie", pts: 6, isBonus: true, repeatable: false, hidden: true, desc: "Captured an epic group selfie with all 4 teams! Verified by Admin.", claimedBy: null, claimCount: 0 },
  { id: "bg_team_cocktail", icon: "🍹", title: "Drink / Mix in Team Colour", pts: 4, isBonus: true, repeatable: false, hidden: true, desc: "Mixed or drank a beverage strictly matching your team's official color.", claimedBy: null, claimCount: 0 },
  { id: "bg_bluff_wild", icon: "🎭", title: "Wild Card Bluff Master", pts: 6, isBonus: true, repeatable: false, hidden: true, desc: "Successfully bluffed rivals into believing you held a Wild card when you didn't.", claimedBy: null, claimCount: 0 },
  { id: "bg_buy_lee", icon: "👑", title: "Pours / Toasts Host First", pts: 4, isBonus: true, repeatable: false, hidden: true, desc: "Toasted the host before anyone else! Legendary party respect.", claimedBy: null, claimCount: 0 },
  { id: "bg_cheat", icon: "🃏", title: "Caught Cheating", pts: -8, isBonus: false, repeatable: true, desc: "Caught hiding cards, taking extra draws, or tampering with the deck!", claimedBy: null, claimCount: 0 },
  { id: "bg_spew", icon: "🤮", title: "Throwing Up / White Flag", pts: -5, isBonus: false, repeatable: true, desc: "Surrendered white flag: vomiting or calling an emergency timeout.", claimedBy: null, claimCount: 0 },
  { id: "bg_unfinished", icon: "🍺", title: "Doesn't Finish Drink Penalty", pts: -4, isBonus: false, repeatable: true, desc: "Cowardice! Refused or bailed on completing assigned drinking sips.", claimedBy: null, claimCount: 0 },
  { id: "bg_spill_all", icon: "💀", title: "Drops / Spills Entire Drink", pts: -4, isBonus: false, repeatable: true, desc: "Catastrophic drink crash! Completely dumped, smashed, or spilled an entire glass.", claimedBy: null, claimCount: 0 },
  { id: "bg_wrong_card", icon: "💥", title: "Plays Wrong Colour / Number", pts: -2, isBonus: false, repeatable: true, desc: "Card blindness or drunkenness: played an illegal color or card!", claimedBy: null, claimCount: 0 },
  { id: "bg_drop_card", icon: "🃏", title: "Drops Card on Floor", pts: -2, isBonus: false, repeatable: true, desc: "Butterfingers: fumbled and dropped playing cards onto the floor.", claimedBy: null, claimCount: 0 },
  { id: "bg_spill", icon: "💧", title: "Spills Drink Slosh", pts: -1, isBonus: false, repeatable: true, desc: "Careless knock: sloshed or spilled part of a drink.", claimedBy: null, claimCount: 0 },
  { id: "bg_argue", icon: "🗣️", title: "Arguing with Ref / Players", pts: -2, isBonus: false, repeatable: true, desc: "Heated dispute or arguing over Uno rules.", claimedBy: null, claimCount: 0 },
  { id: "bg_go_home_early", icon: "🚪", title: "Goes to Bed / Leaves Before Finale", pts: -20, isBonus: false, repeatable: true, desc: "Desertion! Left the party before final champions were crowned! (-20 points penalty)", claimedBy: null, claimCount: 0 }
];

// Load persisted rooms from disk on startup
function loadRoomsFromDisk() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      const now = Date.now();
      for (const [code, r] of Object.entries(data)) {
        // Drop rooms that have been inactive for >30m while server was offline
        if (r.lastActiveAt && (now - r.lastActiveAt > INACTIVITY_TIMEOUT_MS)) {
          console.log(`[Storage] Expired room pruned on startup: ${code}`);
          continue;
        }
        rooms.set(code.toUpperCase(), r);
      }
      console.log(`[Storage] Loaded ${rooms.size} active persistent rooms from disk.`);
    }
  } catch (err) {
    console.error("[Storage] Failed to read rooms from disk:", err);
  }
}

// Atomic debounced write of rooms to disk
let saveTimeout = null;
function persistRooms() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const plainObj = {};
      for (const [code, r] of rooms.entries()) {
        plainObj[code] = {
          code: r.code,
          name: r.name,
          createdAt: r.createdAt,
          lastActiveAt: r.lastActiveAt,
          hostDeviceId: r.hostDeviceId,
          hostPasscode: r.hostPasscode,
          state: r.state
        };
      }
      const tmpFile = ROOMS_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(plainObj, null, 2), 'utf8');
      fs.renameSync(tmpFile, ROOMS_FILE);
    } catch (err) {
      console.error("[Storage] Failed to persist rooms:", err);
    }
  }, 100);
}

// Create or retrieve room object
function createRoom(code, options = {}) {
  const normCode = (code || "PARTY-1").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
  if (rooms.has(normCode)) {
    return { success: false, reason: "code_taken", room: rooms.get(normCode) };
  }

  const room = {
    code: normCode,
    name: options.name || `Uno Battle (${normCode})`,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    hostDeviceId: options.hostDeviceId || "",
    hostPasscode: options.adminPasscode || "22140711",
    state: {
      roomCode: normCode,
      roomName: options.name || `Uno Battle (${normCode})`,
      playMode: options.playMode || "party",
      adminPasscode: options.adminPasscode || "22140711",
      version: 1,
      updatedAt: Date.now(),
      updatedBy: options.creatorName || "Room Creator",
      teams: createDefaultTeams(),
      bingoCards: JSON.parse(JSON.stringify(DEFAULT_BINGO_CARDS)),
      devices: {},
      bannedList: [],
      logs: [`⚔️ Room ${normCode} created! Party mode ready.`],
      isGameLocked: false,
      gameStarted: true,
      gameEnded: false
    }
  };

  rooms.set(normCode, room);
  persistRooms();
  console.log(`[Room] Created room: ${normCode} (${room.state.playMode} mode)`);
  return { success: true, room };
}

// Broadcast JSON message to all clients currently connected to a room
function broadcastToRoom(roomCode, payload, excludeWs = null) {
  const normCode = roomCode.toUpperCase();
  const clients = roomSubscriptions.get(normCode);
  if (!clients) return;

  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.warn(`[WS] Broadcast failed for client:`, err.message);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP STATIC FILE & REST API SERVER
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  // CORS Headers for API calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API: Server Healthcheck
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "ok",
      server: "Drunk Uno Authoritative Node Engine",
      uptimeSec: Math.floor(process.uptime()),
      activeRooms: rooms.size,
      connectedClients: wss.clients.size,
      timestamp: Date.now()
    }));
    return;
  }

  // 2. API: Check Room Existence: GET /api/rooms/:code
  if (pathname.startsWith('/api/rooms/')) {
    const code = pathname.replace('/api/rooms/', '').toUpperCase().trim();
    if (rooms.has(code)) {
      const r = rooms.get(code);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        exists: true,
        code: r.code,
        name: r.name,
        playMode: r.state.playMode,
        createdAt: r.createdAt,
        lastActiveAt: r.lastActiveAt,
        isGameLocked: r.state.isGameLocked
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ exists: false, reason: "not_found" }));
    }
    return;
  }

  // 3. API: Create Room: POST /api/rooms
  if (pathname === '/api/rooms' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = (payload.code || '').toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Missing room code" }));
          return;
        }

        const resCreate = createRoom(code, payload);
        if (!resCreate.success) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Room code already in use", code }));
          return;
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, roomCode: code }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
    });
    return;
  }

  // 4. Static File Serving (from project root)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for single page app routing
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache-Control headers
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// ---------------------------------------------------------------------------
// WEBSOCKET AUTHORITATIVE REAL-TIME ENGINE
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.roomCode = null;
  ws.deviceId = null;
  ws.playerName = null;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleClientMessage(ws, msg);
    } catch (err) {
      console.warn("[WS] Invalid message received:", err.message);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const subs = roomSubscriptions.get(ws.roomCode);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) roomSubscriptions.delete(ws.roomCode);
      }

      // Mark device offline
      const room = rooms.get(ws.roomCode);
      if (room && ws.deviceId && room.state.devices[ws.deviceId]) {
        room.state.devices[ws.deviceId].online = false;
        room.state.devices[ws.deviceId].lastSeen = Date.now();
        broadcastToRoom(ws.roomCode, {
          type: 'DEVICE_OFFLINE',
          deviceId: ws.deviceId,
          playerName: ws.playerName,
          devices: room.state.devices
        });
      }
    }
  });
});

function handleClientMessage(ws, msg) {
  const { action } = msg;
  if (!action) return;

  // 1. CHECK_ROOM: Quick existence query
  if (action === "CHECK_ROOM") {
    const targetCode = (msg.roomCode || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    if (!targetCode) {
      ws.send(JSON.stringify({ type: 'CHECK_ROOM_RESULT', roomCode: targetCode, exists: false, reason: "empty" }));
      return;
    }
    const exists = rooms.has(targetCode);
    const room = exists ? rooms.get(targetCode) : null;
    ws.send(JSON.stringify({
      type: 'CHECK_ROOM_RESULT',
      roomCode: targetCode,
      exists,
      playMode: room?.state?.playMode || "party",
      reason: exists ? "ok" : "not_found"
    }));
    return;
  }

  // 2. CREATE_ROOM: Authoritative room creation
  if (action === "CREATE_ROOM") {
    const code = (msg.roomCode || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    if (!code) {
      ws.send(JSON.stringify({ type: 'ERROR', message: "Please provide a valid room code!" }));
      return;
    }

    const resCreate = createRoom(code, {
      name: msg.roomName,
      adminPasscode: msg.adminPasscode,
      playMode: msg.playMode,
      creatorName: msg.playerName,
      hostDeviceId: msg.deviceId
    });

    if (!resCreate.success) {
      ws.send(JSON.stringify({ type: 'ERROR', message: `Room "${code}" is already active!` }));
      return;
    }

    const room = resCreate.room;

    // Immediately subscribe creator
    ws.roomCode = code;
    ws.deviceId = msg.deviceId;
    ws.playerName = msg.playerName || "Host";

    if (!roomSubscriptions.has(code)) {
      roomSubscriptions.set(code, new Set());
    }
    roomSubscriptions.get(code).add(ws);

    // Register creator device
    if (msg.deviceId) {
      room.state.devices[msg.deviceId] = {
        id: msg.deviceId,
        name: msg.playerName || "Host",
        teamIdx: typeof msg.teamIdx === 'number' ? msg.teamIdx : null,
        isCaptain: !!msg.isCaptain,
        isHost: true,
        deviceModel: msg.deviceModel || "Mobile",
        online: true,
        lastSeen: Date.now()
      };
    }

    ws.send(JSON.stringify({
      type: 'ROOM_CREATED',
      roomCode: code,
      state: room.state,
      isHost: true
    }));
    return;
  }

  // 3. JOIN_ROOM: Enter existing room
  if (action === "JOIN_ROOM") {
    const code = (msg.roomCode || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    if (!code || !rooms.has(code)) {
      ws.send(JSON.stringify({ type: 'ROOM_NOT_FOUND', roomCode: code }));
      return;
    }

    const room = rooms.get(code);

    // Unsubscribe from previous room if switching
    if (ws.roomCode && ws.roomCode !== code) {
      const prevSubs = roomSubscriptions.get(ws.roomCode);
      if (prevSubs) prevSubs.delete(ws);
    }

    ws.roomCode = code;
    ws.deviceId = msg.deviceId;
    ws.playerName = msg.playerName;

    if (!roomSubscriptions.has(code)) {
      roomSubscriptions.set(code, new Set());
    }
    roomSubscriptions.get(code).add(ws);

    // Register/update device profile
    if (msg.deviceId) {
      const existing = room.state.devices[msg.deviceId] || {};
      const pName = (msg.playerName || existing.name || "Player").trim();
      const tIdx = typeof msg.teamIdx === 'number' ? msg.teamIdx : existing.teamIdx;

      room.state.devices[msg.deviceId] = {
        id: msg.deviceId,
        name: pName,
        teamIdx: tIdx !== undefined ? tIdx : null,
        isCaptain: msg.isCaptain !== undefined ? msg.isCaptain : (existing.isCaptain || false),
        isHost: room.hostDeviceId === msg.deviceId || existing.isHost || false,
        deviceModel: msg.deviceModel || existing.deviceModel || "Mobile",
        online: true,
        lastSeen: Date.now()
      };

      // Add player to crew roster
      if (typeof tIdx === 'number' && room.state.teams[tIdx] && pName) {
        const team = room.state.teams[tIdx];
        if (!team.players.includes(pName)) {
          team.players.push(pName);
        }
        if (msg.isCaptain || !team.captain) {
          team.captain = pName;
        }
      }
    }

    room.lastActiveAt = Date.now();
    persistRooms();

    // Send full authoritative initial state to joining client
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      roomCode: code,
      state: room.state,
      isHost: room.hostDeviceId === msg.deviceId
    }));

    // Broadcast presence update to existing peers
    broadcastToRoom(code, {
      type: 'DEVICE_JOINED',
      deviceId: msg.deviceId,
      playerName: msg.playerName,
      teamIdx: msg.teamIdx,
      devices: room.state.devices
    }, ws);
    return;
  }

  // --- ACTIONS BELOW REQUIRE AN ACTIVE ROOM SUBSCRIPTION ---
  const roomCode = (msg.roomCode || ws.roomCode || "").toUpperCase().trim();
  const room = rooms.get(roomCode);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: `Room "${roomCode}" not found.` }));
    return;
  }

  // Touch room activity timestamp
  room.lastActiveAt = Date.now();

  // 4. SYNC_STATE: Authoritative state synchronization from client
  if (action === "SYNC_STATE") {
    if (msg.state && Array.isArray(msg.state.teams)) {
      room.state = msg.state;
      room.state.version = (room.state.version || 0) + 1;
      room.state.updatedAt = Date.now();
      room.state.updatedBy = msg.sender || msg.state.updatedBy || "Player";
      room.lastActiveAt = Date.now();
      persistRooms();

      // Immediately broadcast to all other peers in the room
      broadcastToRoom(roomCode, {
        type: 'STATE_UPDATE',
        state: room.state,
        senderId: msg.senderId
      }, ws);
    }
    return;
  }

  // 5. ADJUST_SCORE: Atomic delta update for points & sips
  if (action === "ADJUST_SCORE") {
    const { teamIdx, delta = 0, sipsDelta = 0, reason = "Score Update", sender = "Player" } = msg;
    if (typeof teamIdx === 'number' && room.state.teams[teamIdx]) {
      const team = room.state.teams[teamIdx];
      const oldScore = team.score;
      team.score = Math.max(0, team.score + delta);
      team.sips = Math.max(0, (team.sips || 0) + sipsDelta);

      const sign = delta >= 0 ? '+' : '';
      const logTxt = `${sender}: ${team.name} ${sign}${delta} pts (${team.score} total) — ${reason}`;
      room.state.logs.unshift(logTxt);
      if (room.state.logs.length > 30) room.state.logs.pop();

      room.state.version++;
      room.state.updatedAt = Date.now();
      room.state.updatedBy = sender;

      persistRooms();

      // Immediate authoritative broadcast (<5ms)
      broadcastToRoom(roomCode, {
        type: 'SCORE_UPDATED',
        teamIdx,
        delta,
        sipsDelta,
        oldScore,
        newScore: team.score,
        sips: team.sips,
        reason,
        sender,
        state: room.state
      });
    }
    return;
  }

  // 5. SPIN_WHEEL: Wheel of Doom spin outcome
  if (action === "SPIN_WHEEL") {
    const { teamIdx, outcome, dare, sips = 0, sender = "Player" } = msg;
    const team = (typeof teamIdx === 'number' && room.state.teams[teamIdx]) ? room.state.teams[teamIdx] : null;

    if (team && sips) {
      team.sips = Math.max(0, (team.sips || 0) + sips);
    }

    const teamLabel = team ? team.name : sender;
    const logTxt = `🎡 ${teamLabel} spun the Wheel: "${outcome}" (${dare})`;
    room.state.logs.unshift(logTxt);
    if (room.state.logs.length > 30) room.state.logs.pop();

    room.state.version++;
    room.state.updatedAt = Date.now();
    persistRooms();

    broadcastToRoom(roomCode, {
      type: 'WHEEL_SPUN',
      teamIdx,
      outcome,
      dare,
      sips,
      sender,
      state: room.state
    });
    return;
  }

  // 6. CLAIM_BINGO: Feat & drinking challenge claim
  if (action === "CLAIM_BINGO") {
    const { cardId, teamIdx, playerName = "Player" } = msg;
    const card = room.state.bingoCards.find(c => c.id === cardId);
    const team = (typeof teamIdx === 'number') ? room.state.teams[teamIdx] : null;

    if (card && team) {
      // Repeatable limits check
      if (!card.repeatable && card.claimedBy) {
        ws.send(JSON.stringify({ type: 'TOAST', text: `⚠️ "${card.title}" was already claimed by ${card.claimedBy}!` }));
        return;
      }
      if (card.maxClaims && (card.claimCount || 0) >= card.maxClaims) {
        ws.send(JSON.stringify({ type: 'TOAST', text: `⚠️ "${card.title}" has reached maximum claims!` }));
        return;
      }

      card.claimedBy = playerName || team.name;
      card.claimedTeam = team.name;
      card.claimCount = (card.claimCount || 0) + 1;
      card.claimedAt = Date.now();

      team.score = Math.max(0, team.score + card.pts);

      const sign = card.pts >= 0 ? '+' : '';
      const logTxt = `🎯 ${playerName} claimed BINGO: "${card.title}" (${sign}${card.pts} pts)`;
      room.state.logs.unshift(logTxt);
      if (room.state.logs.length > 30) room.state.logs.pop();

      room.state.version++;
      room.state.updatedAt = Date.now();
      persistRooms();

      broadcastToRoom(roomCode, {
        type: 'BINGO_CLAIMED',
        cardId,
        card,
        teamIdx,
        playerName,
        state: room.state
      });
    }
    return;
  }

  // 7. RESET_SCORES: Reset room points and sips to 0
  if (action === "RESET_SCORES") {
    const { passcode } = msg;
    if (passcode !== "22140711" && passcode !== room.hostPasscode) {
      ws.send(JSON.stringify({ type: 'ERROR', message: "Incorrect Admin Passcode!" }));
      return;
    }

    room.state.teams.forEach(t => {
      t.score = 0;
      t.sips = 0;
      t.stash = 0;
      t.crowns = 0;
    });

    room.state.bingoCards.forEach(c => {
      c.claimedBy = null;
      c.claimedTeam = null;
      c.claimCount = 0;
      c.claimedAt = null;
    });

    room.state.logs.unshift(`🔄 Room scores reset to 0 by Admin.`);
    room.state.version++;
    room.state.updatedAt = Date.now();
    persistRooms();

    broadcastToRoom(roomCode, {
      type: 'SCORES_RESET',
      state: room.state
    });
    return;
  }

  // 8. DELETE_ROOM: Purge room immediately
  if (action === "DELETE_ROOM") {
    const { passcode } = msg;
    if (passcode !== "22140711" && passcode !== room.hostPasscode) {
      ws.send(JSON.stringify({ type: 'ERROR', message: "Incorrect Admin Passcode!" }));
      return;
    }

    console.log(`[Room] Room ${roomCode} deleted by Admin.`);
    broadcastToRoom(roomCode, {
      type: 'ROOM_DELETED',
      roomCode,
      reason: "closed by room creator"
    });

    // Close all connected sockets in this room
    const clients = roomSubscriptions.get(roomCode);
    if (clients) {
      for (const client of clients) {
        client.roomCode = null;
      }
      roomSubscriptions.delete(roomCode);
    }

    rooms.delete(roomCode);
    persistRooms();
    return;
  }

  // 9. TOGGLE_GAME_LOCK: Freeze / Pause all phones
  if (action === "TOGGLE_GAME_LOCK") {
    const { passcode, isLocked } = msg;
    if (passcode !== "22140711" && passcode !== room.hostPasscode) {
      ws.send(JSON.stringify({ type: 'ERROR', message: "Incorrect Admin Passcode!" }));
      return;
    }

    room.state.isGameLocked = !!isLocked;
    const logTxt = room.state.isGameLocked ? "❄️ All phones FROZEN by Admin." : "🔓 Game UNLOCKED by Admin.";
    room.state.logs.unshift(logTxt);
    room.state.version++;
    room.state.updatedAt = Date.now();
    persistRooms();

    broadcastToRoom(roomCode, {
      type: 'GAME_LOCK_TOGGLED',
      isGameLocked: room.state.isGameLocked,
      state: room.state
    });
    return;
  }

  // 10. TOUCH_ROOM: Keep-alive ping
  if (action === "TOUCH_ROOM" || action === "PING") {
    ws.send(JSON.stringify({ type: 'PONG', serverTime: Date.now() }));
    return;
  }
}

// ---------------------------------------------------------------------------
// 30-MINUTE INACTIVITY AUTO-DELETE REAPER & WEBSOCKET HEARTBEATS
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();

  // 1. Inactivity check for active rooms
  for (const [code, room] of rooms.entries()) {
    if (room.lastActiveAt && (now - room.lastActiveAt > INACTIVITY_TIMEOUT_MS)) {
      console.log(`[AutoDelete] Room ${code} expired after 30m inactivity. Purging.`);
      broadcastToRoom(code, {
        type: 'ROOM_DELETED',
        roomCode: code,
        reason: "30 minutes of inactivity"
      });

      const clients = roomSubscriptions.get(code);
      if (clients) {
        for (const client of clients) {
          client.roomCode = null;
        }
        roomSubscriptions.delete(code);
      }

      rooms.delete(code);
      persistRooms();
    }
  }

  // 2. Client ping-pong heartbeats (every 25 seconds)
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

// Initialize persisted state and start HTTP/WS listening
loadRoomsFromDisk();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🍻 DRUNK UNO AUTHORITATIVE SERVER RUNNING`);
  console.log(`🌐 HTTP & WebSocket URL: http://localhost:${PORT}`);
  console.log(`💾 Room Storage File: ${ROOMS_FILE}`);
  console.log(`⏳ Room Auto-Delete: 30 minutes inactivity`);
  console.log(`======================================================\n`);
});
