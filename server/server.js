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
const { drawTiles, calculateScore, createTileBag, createEmptyBoard } = require("./server-utils");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 8080;

// Serve static files from the React app build directory
// __dirname will be /app/server inside the container, so go up one level
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

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

// The "catchall" handler: for any request that doesn't match other routes, send back the React index.html file.
app.get('*', (req, res) => {
    console.log("Handling catch-all route for:", req.path);
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
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

function calculateTotalTiles(game) {
    let totalTiles = 0;
    let boardTiles = 0;

    // Count tiles on the board
    if (game && game.board) {
        for (let i = 0; i < game.board.length; i++) {
            for (let j = 0; j < game.board[i].length; j++) {
                if (game.board[i][j].tile) {
                    boardTiles++;
                }
            }
        }
    }

    // Count tiles in racks and bag
    if (game && game.players) {
        const player1Rack = game.players[0].rack.length;
        const player2Rack = game.players[1].rack.length;
        const tileBag = game.bag.length;
        totalTiles = player1Rack + player2Rack + tileBag + boardTiles;
        console.log(`Total Tiles: ${totalTiles}, P1 Rack: ${player1Rack}, P2 Rack: ${player2Rack}, Bag: ${tileBag}, Board: ${boardTiles}`);
    } else {
        console.log("Game not initialized yet.");
    }
}

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinGame", (playerId) => {
        console.log("joinGame - Player joined game:", playerId);

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
            console.log("joinGame - Reconnecting player to existing game:", existingGame.gameId);
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

            console.log("joinGame - Calculating total tiles after player reconnection.");
            calculateTotalTiles(existingGame.game);

            return;
        }

        // No existing game found - proceed with normal matchmaking
        console.log("joinGame - No existing game found, proceeding with matchmaking.");
        socket.playerId = playerId;
        addPlayerToQueue(playerId);

        const matchedPlayers = matchPlayers();
        if (matchedPlayers) {
            console.log("joinGame - Matched players:", matchedPlayers);
            const { gameId, player1, player2 } = matchedPlayers;

            // Correctly find the sockets for player1 and player2
            const player1Socket = findSocketByPlayerId(player1);
            const player2Socket = findSocketByPlayerId(player2);

            if (player1Socket) {
                console.log("joinGame - Player 1 socket:", player1Socket.id);
                player1Socket.join(gameId);
            } else {
                console.error("joinGame - Error: Could not find socket for player 1");
            }

            if (player2Socket) {
                console.log("joinGame - Player 2 socket:", player2Socket.id);
                player2Socket.join(gameId);
            } else {
                console.error("joinGame - Error: Could not find socket for player 2");
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
            console.log(`joinGame - Game ${gameId} is starting with players ${player1} and ${player2}`);

            console.log("joinGame - Calculating total tiles after game creation.");
            calculateTotalTiles(game);
        }
    });

    socket.on("updateBoard", (newBoard) => {
        console.log("updateBoard - Received updateBoard event");
        const gameId = Array.from(socket.rooms).filter(room => room !== socket.id)[0];
        const game = getGame(gameId);
        if (game) {
            game.board = newBoard;
            socket.to(gameId).emit("boardUpdate", newBoard);
            console.log("updateBoard - Board updated, calculating total tiles.");
            calculateTotalTiles(game);
        } else {
            console.error("updateBoard - Error: Could not find game");
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
                console.log("updateRack - Updated rack and emitted rackUpdate to game:", gameId);

                console.log("updateRack - Calculating total tiles after rack update.");
                calculateTotalTiles(game);
            } else {
                console.error("updateRack - Error: Could not find player to update rack:", playerId);
            }
        } else {
            console.error("updateRack - Error: Could not find game to update rack:", gameId);
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
                `playWord - [Game ${gameId}] Word played by player: ${game.players[currentPlayer].playerId}, score: ${wordScore}, next turn: ${game.players[nextPlayer].playerId}`
            );

            console.log("playWord - Calculating total tiles after word played.");
            calculateTotalTiles(updatedGame);
        } else {
            console.error("playWord - Error: Could not find game:", gameId);
        }
    });

    socket.on("exchangeTile", (data) => {
        console.log("exchangeTile - Exchanging tile:", data);
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
                    "exchangeTile - Error: Could not find player to update rack during exchange:",
                    playerId
                );
            }

            game.currentPlayer = currentPlayer;
            updateGame(gameId, game);
            io.to(gameId).emit("gameUpdate", game);

            console.log("exchangeTile - Calculating total tiles after tile exchange.");
            calculateTotalTiles(game);
        } else {
            console.error("exchangeTile - Error: Could not find game for tile exchange:", gameId);
        }
    });

    socket.on("passTurn", (data) => {
        console.log("passTurn - Passing turn:", data);
        const { gameId, currentPlayer } = data;
        const game = getGame(gameId);
        if (game) {
            const nextPlayer = (currentPlayer + 1) % 2;
            game.currentPlayer = nextPlayer;
            game.turnEndTime = Date.now() + (150 * 1000); // Reset turn timer

            updateGame(gameId, game);
            io.to(gameId).emit("gameUpdate", game);

            console.log("passTurn - Calculating total tiles after turn pass.");
            calculateTotalTiles(game);
        } else {
            console.error("passTurn - Error: Could not find game to pass turn:", gameId);
        }
    });

    socket.on("shuffleRack", ({ gameId, playerId, rack }) => {
        console.log("shuffleRack - Shuffling rack:", playerId, gameId);
        const game = getGame(gameId);
        if (game) {
            const playerIndex = game.players.findIndex((p) => p.playerId === playerId);
            if (playerIndex !== -1) {
                game.players[playerIndex].rack = rack;
                socket.emit("rackUpdate", { playerId, rack });

                console.log("shuffleRack - Calculating total tiles after rack shuffle.");
                calculateTotalTiles(game);
            } else {
                console.error("shuffleRack - Error: Could not find player to shuffle rack:", playerId);
            }
        } else {
            console.error("shuffleRack - Error: Could not find game to shuffle rack");
        }
    });

    socket.on("removeGame", (gameId) => {
        console.log("removeGame - Removing game:", gameId);
        const game = getGame(gameId);
        if (game) {
            // Remove players from the queue if they were in this game
            game.players.forEach(player => {
                removePlayerFromQueue(player.playerId);
            });

            // Explicitly remove the game from activeGames
            delete activeGames[gameId];

            console.log("removeGame - Game removed:", gameId);
            io.to(gameId).emit("gameOver", game);
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        if (socket.playerId) {
            removePlayerFromQueue(socket.playerId);
        }
    });

    socket.on("timeUpdate", ({ gameId, timeLeft }) => {
        // Broadcast time update to all players in the game except sender
        socket.to(gameId).emit("timeUpdate", { timeLeft });
    });

    socket.on("requestTurnEndTime", ({ gameId }) => {
        console.log("requestTurnEndTime - Turn end time requested for game:", gameId);
        const game = getGame(gameId);
        if (game) {
            // If no end time exists or we're starting a new turn, create a new end time
            if (!game.turnEndTime || game.turnEndTime < Date.now()) {
                game.turnEndTime = Date.now() + (150 * 1000); // 2.5 minutes
                updateGame(gameId, game);
            }
            console.log("requestTurnEndTime - Sending turn end time:", game.turnEndTime);
            io.in(gameId).emit("turnEndTime", { endTime: game.turnEndTime });
        }
    });

    socket.on("requestGameEndTime", ({ gameId }) => {
        console.log("requestGameEndTime - Game end time requested for game:", gameId);
        const game = getGame(gameId);
        if (game) {
            // If no end time exists, create one
            if (!game.gameEndTime) {
                game.gameEndTime = Date.now() + (1800 * 1000); // 30 minutes in milliseconds
            }
            console.log("requestGameEndTime - Sending game end time:", game.gameEndTime);
            socket.emit("gameEndTime", { endTime: game.gameEndTime });
        }
    });
});

// Bind server to 0.0.0.0 to listen on all interfaces
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});