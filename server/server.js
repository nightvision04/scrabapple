const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "*"
}));

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 8080;

// Load dictionary
const dictionary = new Set();
try {
    const dictPath = path.join(__dirname, 'words.txt');
    const dictData = fs.readFileSync(dictPath, 'utf8');
    dictData.split(/\r?\n/).forEach(word => dictionary.add(word.trim().toLowerCase()));
} catch (err) {
    console.error("Error loading dictionary:", err);
}

const BOARD_BONUSES = {
    '7,7': 'dw', '0,0': 'tw', '0,7': 'tw', '0,14': 'tw',
    '7,0': 'tw', '7,14': 'tw', '14,0': 'tw',
    '14,7': 'tw', '14,14': 'tw',
    '1,1': 'dw', '2,2': 'dw', '3,3': 'dw',
    '4,4': 'dw', '10,10': 'dw', '11,11': 'dw',
    '12,12': 'dw', '13,13': 'dw', '1,13': 'dw',
    '2,12': 'dw', '3,11': 'dw', '4,10': 'dw',
    '10,4': 'dw', '11,3': 'dw', '12,2': 'dw',
    '13,1': 'dw',
    '1,5': 'dl', '1,9': 'dl', '5,1': 'dl',
    '5,5': 'dl', '5,9': 'dl', '5,13': 'dl',
    '9,1': 'dl', '9,5': 'dl', '9,9': 'dl',
    '9,13': 'dl', '13,5': 'dl', '13,9': 'dl',
    '0,3': 'tl', '0,11': 'tl', '2,6': 'tl',
    '2,8': 'tl', '3,0': 'tl', '3,7': 'tl',
    '3,14': 'tl', '6,2': 'tl', '6,6': 'tl',
    '6,8': 'tl', '6,12': 'tl', '7,3': 'tl',
    '7,11': 'tl', '8,2': 'tl', '8,6': 'tl',
    '8,8': 'tl', '8,12': 'tl', '11,0': 'tl',
    '11,7': 'tl', '11,14': 'tl', '12,6': 'tl',
    '12,8': 'tl', '14,3': 'tl', '14,11': 'tl'
};

const createEmptyBoard = () => {
    const board = [];
    for (let i = 0; i < 15; i++) {
        board[i] = [];
        for (let j = 0; j < 15; j++) {
            const coord = `${i},${j}`;
            board[i][j] = { tile: null, bonus: BOARD_BONUSES[coord] || null };
        }
    }
    return board;
};

const createTileBag = () => {
    const distribution = {
        'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3,
        'H': 2, 'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6,
        'O': 8, 'P': 2, 'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4,
        'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, '_': 2
    };
    const bag = [];
    for (const letter in distribution) {
        for (let i = 0; i < distribution[letter]; i++) {
            bag.push(letter);
        }
    }
    return bag;
};

const drawTiles = (bag, num) => {
    const drawn = [];
    for (let i = 0; i < num; i++) {
        if (bag.length > 0) {
            const randomIndex = Math.floor(Math.random() * bag.length);
            drawn.push(bag.splice(randomIndex, 1)[0]);
        }
    }
    return drawn;
};

let gameState = {
    board: createEmptyBoard(),
    players: [
        { score: 0, rack: [], socketId: null },
        { score: 0, rack: [], socketId: null }
    ],
    currentPlayer: 0,
    bag: createTileBag(),
    gameStarted: false
};

let connectedPlayers = 0;

const sendGameStateToPlayer = (socket, playerId) => {
    const playerSpecificGameState = {
        ...gameState,
        players: gameState.players.map((player, index) => ({
            score: player.score,
            rack: index === playerId ? player.rack : []
        }))
    };

    socket.emit('gameUpdate', playerSpecificGameState);
};

// Add the route handler for /validate-word/:word
app.get('/validate-word/:word', (req, res) => {
    const word = req.params.word.toLowerCase();
    const isValid = dictionary.has(word);
    res.json({ isValid });
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    connectedPlayers++;

    socket.on('joinGame', () => {
        if (connectedPlayers <= 2) {
            const playerId = gameState.players.findIndex(player => player.rack.length === 0);
            if (playerId !== -1) {
                gameState.players[playerId].socketId = socket.id; // Assign socketId here
                gameState.players[playerId].rack = drawTiles(gameState.bag, 7);
                sendGameStateToPlayer(socket, playerId);
            }

            if (connectedPlayers === 2) {
                gameState.gameStarted = true;
                io.emit('gameUpdate', gameState);
            }
        } else {
            socket.emit('errorMessage', 'Game is full');
        }
    });

    socket.on('updateBoard', (newBoard) => {
        gameState.board = newBoard;
        socket.broadcast.emit('boardUpdate', newBoard);
    });

    socket.on('updateRack', ({ playerId, rack }) => {
        gameState.players[playerId].rack = rack;
        socket.broadcast.emit('rackUpdate', { playerId, rack });
    });

    socket.on('playWord', (newGameState) => {
        // Update only the necessary parts of the gameState
        gameState.board = newGameState.board;
        gameState.players = newGameState.players;
        gameState.currentPlayer = newGameState.currentPlayer;

        // Refill the current player's rack
        const currentPlayer = gameState.currentPlayer;
        const tilesNeeded = 7 - gameState.players[currentPlayer].rack.length;
        const newTiles = drawTiles(gameState.bag, tilesNeeded);
        gameState.players[currentPlayer].rack.push(...newTiles);

        // Emit the updated game state
        io.emit('gameUpdate', gameState);
    });

    socket.on('exchangeTile', ({ playerId, rack, tileToExchange, currentPlayer }) => {
        gameState.bag.push(tileToExchange);
        const newTiles = drawTiles(gameState.bag, 1);
        gameState.players[playerId].rack = [...rack, ...newTiles];
        gameState.currentPlayer = currentPlayer;
        io.emit('gameUpdate', gameState);
    });

    socket.on('passTurn', ({ currentPlayer }) => {
        gameState.currentPlayer = currentPlayer;
        io.emit('gameUpdate', gameState);
    });

    socket.on('shuffleRack', ({ playerId, rack }) => {
        gameState.players[playerId].rack = rack;
        socket.emit('rackUpdate', { playerId, rack });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedPlayers--;
        if (connectedPlayers === 0) {
            gameState = {
                board: createEmptyBoard(),
                players: [
                    { score: 0, rack: [], socketId: null },
                    { score: 0, rack: [], socketId: null }
                ],
                currentPlayer: 0,
                bag: createTileBag(),
                gameStarted: false
            };
        }
    });
});

// Bind server to 0.0.0.0 to listen on all interfaces
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});