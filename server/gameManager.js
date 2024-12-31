const { createEmptyBoard, createTileBag, drawTiles } = require('./server-utils');

// Initialize activeGames as an empty object
const activeGames = {};
const playerQueue = [];

const generateGameId = () => {
    return Math.random().toString(36).substr(2, 9);
};

const createNewGame = (player1, player2) => {
    console.log('Creating new game:', player1, player2);
    const gameId = generateGameId();
    console.log('Game ID:', gameId);
    const newGame = {
        gameId,
        board: createEmptyBoard(),
        players: [
            { playerId: player1, score: 0, rack: drawTiles(createTileBag(), 7), socketId: null },
            { playerId: player2, score: 0, rack: drawTiles(createTileBag(), 7), socketId: null }
        ],
        currentPlayer: 0,
        bag: createTileBag(),
        gameStarted: true,
        lastPlayedTiles: [],
        secondToLastPlayedTiles: []
    };
    activeGames[gameId] = newGame;
    console.log('New game created:', gameId);
    return gameId;
};

const getGame = (gameId) => {
    console.log('Getting game:', gameId);
    return activeGames[gameId];
};

const removeGame = (gameId) => {
    console.log('Removing game:', gameId);
    delete activeGames[gameId];
};

const addPlayerToQueue = (playerId) => {
    console.log('Adding player to queue:', playerId);
    if (!playerQueue.includes(playerId)) {
        playerQueue.push(playerId);
        console.log('Player added to queue:', playerId);
    } else {
        console.log('Player already in queue:', playerId);
    }
    console.log("Current player queue:", playerQueue);
};

const removePlayerFromQueue = (playerId) => {
    console.log('Removing player from queue:', playerId);
    const index = playerQueue.indexOf(playerId);
    if (index > -1) {
        playerQueue.splice(index, 1);
        console.log('Player removed from queue:', playerId);
    } else {
        console.log('Player not in queue:', playerId);
    }
};

const matchPlayers = () => {
    console.log('Matching players, current queue:', playerQueue);
    if (playerQueue.length >= 2) {
        const player1 = playerQueue.shift();
        const player2 = playerQueue.shift();
        console.log('Matched players:', player1, player2);
        const gameId = createNewGame(player1, player2);
        return { gameId, player1, player2 };
    }
    console.log('Not enough players to match.');
    return null;
};

const updateGame = (gameId, updatedGame) => {
    console.log('Updating game:', gameId);
    if (activeGames[gameId]) {
        activeGames[gameId] = updatedGame;
        console.log('Game updated:', gameId);
    } else {
        console.log('Game not found:', gameId);
    }
};

module.exports = {
    getGame,
    removeGame,
    addPlayerToQueue,
    removePlayerFromQueue,
    matchPlayers,
    updateGame,
    activeGames
};