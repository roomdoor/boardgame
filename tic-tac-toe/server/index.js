const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 3000;

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const rooms = new Map();

const projectRoot = path.resolve(__dirname, "..");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = requestUrl.pathname;
  if (pathname === "/") {
    pathname = "/index.html";
  }

  try {
    pathname = decodeURIComponent(pathname);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request\n");
    return;
  }

  const resolvedPath = path.resolve(projectRoot, `.${pathname}`);
  if (resolvedPath !== projectRoot && !resolvedPath.startsWith(`${projectRoot}${path.sep}`)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found\n");
    return;
  }

  fs.stat(resolvedPath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found\n");
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";
    fs.readFile(resolvedPath, (readError, data) => {
      if (readError) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server Error\n");
        return;
      }

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });
});

const wss = new WebSocket.Server({ server });

const send = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const broadcast = (room, payload) => {
  room.clients.forEach((client) => send(client, payload));
};

const generateRoomCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

const createRoom = (owner) => {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const room = {
    code: roomCode,
    clients: [owner],
    board: Array(9).fill(null),
    currentTurn: "X",
    active: true,
  };

  rooms.set(roomCode, room);
  owner.roomCode = roomCode;
  owner.symbol = "X";
  send(owner, { type: "room_created", roomCode, symbol: "X" });
  return room;
};

const resetRoom = (room) => {
  room.board = Array(9).fill(null);
  room.currentTurn = "X";
  room.active = true;
  broadcast(room, {
    type: "state",
    board: room.board,
    currentTurn: room.currentTurn,
    winner: null,
    line: null,
    draw: false,
  });
};

const getWinner = (board) => {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
};

const handleMove = (room, ws, index) => {
  if (!room.active) {
    return;
  }

  if (ws.symbol !== room.currentTurn) {
    send(ws, { type: "error", message: "Not your turn." });
    return;
  }

  if (room.board[index]) {
    send(ws, { type: "error", message: "Cell already taken." });
    return;
  }

  room.board[index] = ws.symbol;
  const winner = getWinner(room.board);
  const draw = room.board.every(Boolean);
  if (winner) {
    room.active = false;
  } else if (draw) {
    room.active = false;
  } else {
    room.currentTurn = room.currentTurn === "X" ? "O" : "X";
  }

  broadcast(room, {
    type: "state",
    board: room.board,
    currentTurn: room.currentTurn,
    winner: winner ? winner.player : null,
    line: winner ? winner.line : null,
    draw: !winner && draw,
  });
};

const cleanupRoom = (roomCode, exceptClient) => {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }
  room.clients.forEach((client) => {
    if (client !== exceptClient) {
      send(client, { type: "opponent_left" });
      client.roomCode = null;
      client.symbol = null;
    }
  });
  rooms.delete(roomCode);
};

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.symbol = null;

  ws.on("message", (message) => {
    let payload;
    try {
      payload = JSON.parse(message);
    } catch (error) {
      send(ws, { type: "error", message: "Invalid message." });
      return;
    }

    if (!payload || !payload.type) {
      send(ws, { type: "error", message: "Invalid payload." });
      return;
    }

    if (payload.type === "create_room") {
      if (ws.roomCode) {
        send(ws, { type: "error", message: "Already in a room." });
        return;
      }
      createRoom(ws);
      return;
    }

    if (payload.type === "join_room") {
      const roomCode = String(payload.roomCode || "").toUpperCase();
      const room = rooms.get(roomCode);
      if (!room) {
        send(ws, { type: "error", message: "Room not found." });
        return;
      }
      if (room.clients.length >= 2) {
        send(ws, { type: "error", message: "Room is full." });
        return;
      }

      room.clients.push(ws);
      ws.roomCode = roomCode;
      ws.symbol = "O";
      send(ws, { type: "room_joined", roomCode, symbol: "O" });
      broadcast(room, {
        type: "start",
        board: room.board,
        currentTurn: room.currentTurn,
      });
      return;
    }

    const room = rooms.get(ws.roomCode);
    if (!room) {
      send(ws, { type: "error", message: "Not in a room." });
      return;
    }

    if (payload.type === "move") {
      const index = Number(payload.index);
      if (!Number.isInteger(index) || index < 0 || index > 8) {
        send(ws, { type: "error", message: "Invalid move." });
        return;
      }
      handleMove(room, ws, index);
      return;
    }

    if (payload.type === "reset") {
      resetRoom(room);
    }
  });

  ws.on("close", () => {
    if (ws.roomCode) {
      cleanupRoom(ws.roomCode, ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
