const statusEl = document.getElementById("status");
const subtitleEl = document.getElementById("subtitle");
const resetButton = document.getElementById("reset");
const cells = Array.from(document.querySelectorAll(".cell"));

const modeLocalButton = document.getElementById("modeLocal");
const modeOnlineButton = document.getElementById("modeOnline");
const onlinePanel = document.getElementById("onlinePanel");
const createRoomButton = document.getElementById("createRoom");
const joinRoomButton = document.getElementById("joinRoom");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomCodeDisplay = document.getElementById("roomCode");

const localPlayer = "X";
const aiPlayer = "O";

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

let mode = "local";
let board = Array(9).fill(null);
let gameActive = true;
let aiLocked = false;

let socket = null;
let pendingAction = null;
let onlineState = {
  connected: false,
  roomCode: null,
  symbol: null,
  myTurn: false,
};

const updateStatus = (message) => {
  statusEl.textContent = message;
};

const setSubtitle = (message) => {
  subtitleEl.textContent = message;
};

const setRoomCode = (code) => {
  roomCodeDisplay.textContent = code || "-";
};

const getWinner = (state) => {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { player: state[a], line };
    }
  }
  return null;
};

const renderBoard = () => {
  cells.forEach((cell, index) => {
    const value = board[index];
    cell.textContent = value || "";
    cell.classList.remove("x", "o");
    if (value === "X") {
      cell.classList.add("x");
    }
    if (value === "O") {
      cell.classList.add("o");
    }
  });
};

const clearWinHighlight = () => {
  cells.forEach((cell) => cell.classList.remove("win"));
};

const highlightWinningLine = (line) => {
  if (!line) {
    return;
  }
  line.forEach((index) => cells[index].classList.add("win"));
};

const syncBoardInteractivity = () => {
  cells.forEach((cell) => {
    const index = Number(cell.dataset.index);
    const occupied = Boolean(board[index]);
    if (mode === "local") {
      cell.disabled = occupied || !gameActive || aiLocked;
    } else {
      cell.disabled = occupied || !gameActive || !onlineState.myTurn;
    }
  });
};

const resetBoard = () => {
  board = Array(9).fill(null);
  gameActive = true;
  aiLocked = false;
  clearWinHighlight();
  renderBoard();
  syncBoardInteractivity();
};

const setMode = (nextMode) => {
  mode = nextMode;
  modeLocalButton.classList.toggle("active", mode === "local");
  modeOnlineButton.classList.toggle("active", mode === "online");
  onlinePanel.classList.toggle("hidden", mode !== "online");
  roomCodeInput.value = "";
  setRoomCode(null);
  clearWinHighlight();

  if (mode === "local") {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    onlineState = { connected: false, roomCode: null, symbol: null, myTurn: false };
    setSubtitle("Player (X) vs Computer (O)");
    resetBoard();
    updateStatus("Your turn");
    return;
  }

  setSubtitle("Online PVP (room code)");
  updateStatus("Create or join a room");
  resetBoard();
};

const endLocalGame = (message, winningLine) => {
  gameActive = false;
  updateStatus(message);
  highlightWinningLine(winningLine);
  syncBoardInteractivity();
};

const checkLocalGameState = () => {
  const winner = getWinner(board);
  if (winner) {
    endLocalGame(
      winner.player === localPlayer ? "You win!" : "Computer wins!",
      winner.line
    );
    return true;
  }

  if (board.every(Boolean)) {
    endLocalGame("Draw game.");
    return true;
  }

  return false;
};

const minimax = (state, player) => {
  const winner = getWinner(state);
  if (winner) {
    return { score: winner.player === aiPlayer ? 1 : -1 };
  }

  if (state.every(Boolean)) {
    return { score: 0 };
  }

  const moves = [];

  state.forEach((value, index) => {
    if (value) {
      return;
    }

    const nextState = state.slice();
    nextState[index] = player;
    const result = minimax(nextState, player === aiPlayer ? localPlayer : aiPlayer);
    moves.push({ index, score: result.score });
  });

  if (player === aiPlayer) {
    return moves.reduce((best, move) => (move.score > best.score ? move : best));
  }

  return moves.reduce((best, move) => (move.score < best.score ? move : best));
};

const handleAiTurn = () => {
  if (!gameActive) {
    return;
  }

  aiLocked = true;
  updateStatus("Computer thinking...");
  syncBoardInteractivity();

  window.setTimeout(() => {
    const bestMove = minimax(board, aiPlayer).index;
    if (bestMove === undefined) {
      aiLocked = false;
      return;
    }

    board[bestMove] = aiPlayer;
    renderBoard();
    const gameOver = checkLocalGameState();
    if (!gameOver) {
      updateStatus("Your turn");
      aiLocked = false;
      syncBoardInteractivity();
    }
  }, 220);
};

const handleLocalMove = (index) => {
  if (!gameActive || aiLocked || board[index]) {
    return;
  }

  board[index] = localPlayer;
  renderBoard();

  if (checkLocalGameState()) {
    return;
  }

  handleAiTurn();
};

const getWebSocketUrl = () => {
  if (window.location.protocol === "file:") {
    return "ws://localhost:3000";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || "localhost:3000";
  return `${protocol}//${host}`;
};

const connectSocket = () => {
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    return;
  }

  socket = new WebSocket(getWebSocketUrl());

  socket.addEventListener("open", () => {
    onlineState.connected = true;
    if (pendingAction) {
      socket.send(JSON.stringify(pendingAction));
      pendingAction = null;
    }
  });

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    handleSocketMessage(payload);
  });

  socket.addEventListener("close", () => {
    onlineState.connected = false;
    if (mode === "online" && onlineState.roomCode) {
      updateStatus("Disconnected from server.");
    }
  });
};

const sendOrQueue = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return;
  }
  pendingAction = message;
  connectSocket();
};

const applyOnlineState = (payload) => {
  board = payload.board;
  renderBoard();
  clearWinHighlight();
  highlightWinningLine(payload.line);
  if (payload.winner) {
    gameActive = false;
    if (payload.winner === onlineState.symbol) {
      updateStatus("You win!");
    } else {
      updateStatus("You lose.");
    }
  } else if (payload.draw) {
    gameActive = false;
    updateStatus("Draw game.");
  } else {
    gameActive = true;
    onlineState.myTurn = payload.currentTurn === onlineState.symbol;
    updateStatus(onlineState.myTurn ? "Your turn" : "Opponent's turn");
  }
  syncBoardInteractivity();
};

const handleSocketMessage = (payload) => {
  if (!payload || !payload.type) {
    return;
  }

  switch (payload.type) {
    case "room_created":
      onlineState.roomCode = payload.roomCode;
      onlineState.symbol = payload.symbol;
      setRoomCode(payload.roomCode);
      updateStatus("Waiting for opponent...");
      break;
    case "room_joined":
      onlineState.roomCode = payload.roomCode;
      onlineState.symbol = payload.symbol;
      setRoomCode(payload.roomCode);
      updateStatus("Waiting for opponent...");
      break;
    case "start":
      applyOnlineState(payload);
      break;
    case "state":
      applyOnlineState(payload);
      break;
    case "error":
      updateStatus(payload.message || "Error");
      break;
    case "opponent_left":
      onlineState.roomCode = null;
      onlineState.symbol = null;
      onlineState.myTurn = false;
      setRoomCode(null);
      resetBoard();
      updateStatus("Opponent left. Create or join a room.");
      break;
    default:
      break;
  }
};

const handleOnlineMove = (index) => {
  if (!gameActive || !onlineState.myTurn || board[index]) {
    return;
  }

  onlineState.myTurn = false;
  updateStatus("Opponent's turn");
  syncBoardInteractivity();
  sendOrQueue({ type: "move", index });
};

const handleCellClick = (event) => {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.index);

  if (mode === "local") {
    handleLocalMove(index);
    return;
  }

  handleOnlineMove(index);
};

const handleReset = () => {
  if (mode === "local") {
    resetBoard();
    updateStatus("Your turn");
    return;
  }

  if (onlineState.roomCode) {
    sendOrQueue({ type: "reset" });
    return;
  }

  resetBoard();
  updateStatus("Create or join a room");
};

const handleCreateRoom = () => {
  if (mode !== "online") {
    setMode("online");
  }
  resetBoard();
  updateStatus("Creating room...");
  sendOrQueue({ type: "create_room" });
};

const handleJoinRoom = () => {
  if (mode !== "online") {
    setMode("online");
  }

  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    updateStatus("Enter a room code.");
    return;
  }

  resetBoard();
  updateStatus("Joining room...");
  sendOrQueue({ type: "join_room", roomCode: code });
};

cells.forEach((cell) => cell.addEventListener("click", handleCellClick));
resetButton.addEventListener("click", handleReset);
modeLocalButton.addEventListener("click", () => setMode("local"));
modeOnlineButton.addEventListener("click", () => setMode("online"));
createRoomButton.addEventListener("click", handleCreateRoom);
joinRoomButton.addEventListener("click", handleJoinRoom);

setMode("local");
