// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const {
  getGame,
  removeGame,
  addPlayerToQueue,
  removePlayerFromQueue,
  matchPlayers,
  updateGame,
} = require("./gameManager");
const { drawTiles } = require("./server-utils");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 8080;

// Load dictionary
const dictionary = new Set();
try {
  const dictPath = path.join(__dirname, "words.txt");
  const dictData = fs.readFileSync(dictPath, "utf8");
  dictData.split(/\r?\n/).forEach((word) => dictionary.add(word.trim().toLowerCase()));
} catch (err) {
  console.error("Error loading dictionary:", err);
}

// Add the route handler for /validate-word/:word
app.get("/validate-word/:word", (req, res) => {
  console.log("Validating word:", req.params.word);
  const word = req.params.word.toLowerCase();
  const isValid = dictionary.has(word);
  res.json({ isValid });
});

// Helper function to find sockets by playerId
function findSocketByPlayerId(playerId) {
  for (const [id, socket] of io.sockets.sockets) {
    if (socket.playerId === playerId) {
      return socket;
    }
  }
  return null; // Socket not found
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinGame", (playerId) => {
    console.log("Player joined game:", playerId);

    // Set playerId on the socket *before* adding to the queue
    socket.playerId = playerId;
    addPlayerToQueue(playerId);

    const matchedPlayers = matchPlayers();
    if (matchedPlayers) {
      console.log("Matched players:", matchedPlayers);
      const { gameId, player1, player2 } = matchedPlayers;

      // Correctly find the sockets for player1 and player2
      const player1Socket = findSocketByPlayerId(player1);
      const player2Socket = findSocketByPlayerId(player2);

      if (player1Socket) {
        console.log("Player 1 socket:", player1Socket.id);
        player1Socket.join(gameId);
      } else {
        console.error("Error: Could not find socket for player 1");
      }

      if (player2Socket) {
        console.log("Player 2 socket:", player2Socket.id);
        player2Socket.join(gameId);
      } else {
        console.error("Error: Could not find socket for player 2");
      }

      // Update socketId and player index for each player in the game
      const game = getGame(gameId);

      game.players[0].socketId = player1Socket.id;
      game.players[0].playerId = player1;
      game.players[1].socketId = player2Socket.id;
      game.players[1].playerId = player2;
      game.currentPlayer = 0; // Set initial currentPlayer to 0 (player 1) when creating the game

      // Set gameStarted to true when the game is created and players are matched
      game.gameStarted = true;

      // Send gameUpdate to each player
      player1Socket.emit("gameUpdate", {
          ...getGame(gameId),
          gameId: gameId,
      });

      player2Socket.emit("gameUpdate", {
        ...getGame(gameId),
        gameId: gameId,
      });

      // Emit gameReady to both players when both are ready
      io.to(gameId).emit('gameReady');
      console.log(`Game ${gameId} is starting with players ${player1} and ${player2}`);
    }
  });

  socket.on("rejoinGame", (playerId) => {
    console.log("Player rejoining game:", playerId);
    let playerFound = false;
    for (const gameId in activeGames) {
      const game = activeGames[gameId];
      if (game.players.find((p) => p.playerId === playerId)) {
        console.log("Player found in game:", gameId);
        socket.join(gameId);

        // Update socketId for rejoined player
        game.players.find((p) => p.playerId === playerId).socketId = socket.id;

        socket.emit("gameUpdate", { ...game, gameId });
        playerFound = true;
        break;
      }
    }
    if (!playerFound) {
      console.log("Player not found in any game:", playerId);
      addPlayerToQueue(playerId);
      socket.playerId = playerId;
    }
  });

  socket.on("updateBoard", (newBoard) => {
    const gameId = Array.from(socket.rooms).filter(room => room !== socket.id)[0];
    const game = getGame(gameId);
    if (game) {
      game.board = newBoard;
      socket
        .to(gameId)
        .emit("boardUpdate", newBoard);
    }
  });

  socket.on("updateRack", ({ gameId, playerId, rack }) => {
    console.log("updateRack - Receiving updateRack event");
    console.log("updateRack - Game ID:", gameId);
    console.log("updateRack - Player ID:", playerId);
    console.log("updateRack - Rack:", rack);

    const game = getGame(gameId);
    if (game) {
        const playerIndex = game.players.findIndex(p => p.playerId === playerId);
        if (playerIndex !== -1) {
            game.players[playerIndex].rack = rack;

            // Emit the rack update to the relevant players
            io.to(gameId).emit("rackUpdate", { playerId, rack });
            console.log("Updated rack and emitted rackUpdate to game:", gameId);
        } else {
            console.error("Error: Could not find player to update rack:", playerId);
        }
    } else {
        console.error("Error: Could not find game to update rack:", gameId);
    }
});

  socket.on("playWord", (data) => {
    console.log("Playing word");
    const { gameId, board, players, currentPlayer, bag, newTiles } = data;
    console.log("Received gameId:", gameId);
    console.log("Received board:", board);
    console.log("Received players:", players);
    console.log("Received currentPlayer:", currentPlayer);
    console.log("Received bag:", bag);
    console.log("Received newTiles:", newTiles);

    const game = getGame(gameId);
    if (game) {
        // Find the player index based on currentPlayer
        const playerIndex = currentPlayer;

        // Update the board and bag in the game
        game.board = board;
        game.bag = bag;

        // Update the current player's score and rack
        if (players && players[playerIndex]) {
            game.players[playerIndex].score = players[playerIndex].score;
            game.players[playerIndex].rack = players[playerIndex].rack;
        } else {
            console.error("Error: Invalid player data received for playWord");
            return;
        }

        // Switch to the next player
        const nextPlayer = (currentPlayer + 1) % 2;
        game.currentPlayer = nextPlayer;

        // Update the game state
        updateGame(gameId, game);

        // Emit the updated game state with newTiles for the current player
        console.log("Updated game");
        io.to(gameId).emit("gameUpdate", {
            ...game,
            newTiles: newTiles // Include new tiles in the game update
        });

        // Explicitly emit a turn update event after the game state has been updated
        io.to(gameId).emit("turnUpdate", game.currentPlayer);
    } else {
        console.error("Error: Game not found for gameId:", gameId);
    }
});

  socket.on("exchangeTile", (data) => {
    console.log("Exchanging tile:", data);
    const { gameId, playerId, rack, tileToExchange, currentPlayer } = data;
    const game = getGame(gameId);
    if (game) {
      game.bag.push(tileToExchange);
      const newTiles = drawTiles(game.bag, 1);

      // Update the player's rack directly using the index
      const playerIndex = game.players.findIndex((p) => p.playerId === playerId);
      if (playerIndex !== -1) {
        game.players[playerIndex].rack = [...rack, ...newTiles];
      } else {
        console.error(
          "Error: Could not find player to update rack during exchange:",
          playerId
        );
      }

      game.currentPlayer = currentPlayer;
      updateGame(gameId, game);
      io.to(gameId).emit("gameUpdate", game);
    } else {
      console.error("Error: Could not find game for tile exchange:", gameId);
    }
  });

  socket.on("passTurn", (data) => {
    console.log("Passing turn:", data);
    const { gameId, currentPlayer } = data;
    const game = getGame(gameId);
    if (game) {
        // Switch to the next player
        const nextPlayer = (currentPlayer + 1) % game.players.length;
        game.currentPlayer = nextPlayer;
        updateGame(gameId, game);
        io.to(gameId).emit("gameUpdate", game);
    } else {
        console.error("Error: Could not find game to pass turn:", gameId);
    }
});

  socket.on("shuffleRack", ({ gameId, playerId, rack }) => {
    console.log("Shuffling rack:", playerId, gameId);
    const game = getGame(gameId);
    if (game) {
      const playerIndex = game.players.findIndex((p) => p.playerId === playerId);
      if (playerIndex !== -1) {
        game.players[playerIndex].rack = rack;
        socket.emit("rackUpdate", { playerId, rack });
      } else {
        console.error("Error: Could not find player to shuffle rack:", playerId);
      }
    } else {
      console.error("Error: Could not find game to shuffle rack");
    }
  });

  socket.on("removeGame", (gameId) => {
    console.log("Removing game:", gameId);
    const game = getGame(gameId);
    if (game) {
      console.log("Game removed:", gameId);
      io.to(gameId).emit("gameOver", game);
      removeGame(gameId);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (socket.playerId) {
      removePlayerFromQueue(socket.playerId);
    }
  });
});

// Bind server to 0.0.0.0 to listen on all interfaces
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
