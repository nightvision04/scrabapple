const { createEmptyBoard, createTileBag, drawTiles } = require('./server-utils');

// Initialize activeGames as an empty object
const activeGames = {};
const playerQueue = [];
let onlinePlayers = new Set();
let waitTimeStats = {
    totalWaitTime: 0,
    matchCount: 0
};

const joinTimes = new Map();

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
    onlinePlayers.add(playerId);
    joinTimes.set(playerId, Date.now());
    
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
    onlinePlayers.delete(playerId);
    joinTimes.delete(playerId);
    
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
        
        // Calculate wait times and update statistics
        const now = Date.now();
        const player1WaitTime = (now - joinTimes.get(player1)) / 1000; // Convert to seconds
        const player2WaitTime = (now - joinTimes.get(player2)) / 1000;
        
        waitTimeStats.totalWaitTime += (player1WaitTime + player2WaitTime);
        waitTimeStats.matchCount += 2;
        
        // Clean up join times
        joinTimes.delete(player1);
        joinTimes.delete(player2);
        
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

const getGameStats = () => {
    return {
        onlinePlayerCount: onlinePlayers.size,
        averageWaitTime: waitTimeStats.matchCount > 0 
            ? Math.round(waitTimeStats.totalWaitTime / waitTimeStats.matchCount)
            : 0
    };
};

module.exports = {
    getGame,
    removeGame,
    addPlayerToQueue,
    removePlayerFromQueue,
    matchPlayers,
    updateGame,
    activeGames,
    getGameStats
};