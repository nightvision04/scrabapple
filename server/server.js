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
  activeGames,
} = require("./gameManager");
const { drawTiles, calculateScore } = require("./server-utils");

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
      
      // First check if player is already in a game
      let existingGame = null;
      for (const [gameId, game] of Object.entries(activeGames)) {
        if (game.players.some(p => p.playerId === playerId)) {
          existingGame = { gameId, game };
          break;
        }
      }
  
      if (existingGame) {
        // Player found in existing game - reconnect them
        console.log("Reconnecting player to existing game:", existingGame.gameId);
        socket.playerId = playerId;
        socket.join(existingGame.gameId);
  
        // Update socket ID for the player
        const playerIndex = existingGame.game.players.findIndex(p => p.playerId === playerId);
        existingGame.game.players[playerIndex].socketId = socket.id;
  
        // Send game state to reconnected player
        socket.emit("gameUpdate", {
          ...existingGame.game,
          gameId: existingGame.gameId
        });
        
        return;
      }
  
      // No existing game found - proceed with normal matchmaking
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
        game.currentPlayer = 0;
  
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
  
    socket.on("updateBoard", (newBoard) => {
      const gameId = Array.from(socket.rooms).filter(room => room !== socket.id)[0];
      const game = getGame(gameId);
      if (game) {
        game.board = newBoard;
        socket.to(gameId).emit("boardUpdate", newBoard);
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
        console.log("playWord - Received playWord event");
        const { gameId, board, players, currentPlayer, bag, newTiles, lastPlayedTiles, secondToLastPlayedTiles } = data;
    
        const game = getGame(gameId);
        if (game) {
            const nextPlayer = (currentPlayer + 1) % 2;
    
            // Calculate the score for the played word
            const wordScore = calculateScore(lastPlayedTiles, board);
    
            // Create an updated players array with the new score
            const updatedPlayers = game.players.map((player, index) => {
                if (index === currentPlayer) {
                    return {
                        ...player,
                        rack: player.rack.filter((tile) => {
                            return !lastPlayedTiles.some((playedTile) => playedTile.tile === tile);
                        }),
                        score: player.score + wordScore
                    };
                }
                return player;
            });
    
            // Add new tiles to the current player's rack
            updatedPlayers[currentPlayer].rack.push(...newTiles);
    
            // Update the game state
            const updatedGame = {
                ...game,
                board,
                bag,
                players: updatedPlayers,
                currentPlayer: nextPlayer,
                lastPlayedTiles: lastPlayedTiles || [],
                secondToLastPlayedTiles: game.lastPlayedTiles || [],
            };
    
            updateGame(gameId, updatedGame);
    
            // Send gameUpdate to the current player with newTiles information
            io.to(game.players[currentPlayer].socketId).emit("gameUpdate", {
                ...updatedGame,
                newTiles,
            });
    
            // Send gameUpdate to the other player *without* newTiles information
            io.to(gameId).except(game.players[currentPlayer].socketId).emit("gameUpdate", {
                ...updatedGame,
            });
    
            io.to(gameId).emit("turnUpdate", nextPlayer);
            console.log(
                `[Game ${gameId}] Word played by player: ${game.players[currentPlayer].playerId}, score: ${wordScore}, next turn: ${game.players[nextPlayer].playerId}`
            );
        } else {
            console.error("playWord - Error: Could not find game:", gameId);
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
