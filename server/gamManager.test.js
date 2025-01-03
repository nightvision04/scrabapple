// gameManager.test.js
const { updateGame, getGame, activeGames } = require('./gameManager');
const { createEmptyBoard, createTileBag, drawTiles } = require('./server-utils');

describe('updateGame (used in playWord)', () => {
    beforeEach(() => {
        // Reset the activeGames object before each test
        for (const gameId in activeGames) {
            delete activeGames[gameId];
        }
    });

    it('should correctly remove played tiles from the player rack', () => {
        // 1. Setup a game state
        const gameId = 'testGameId';
        const player1 = 'player1';
        const player2 = 'player2';

        const bag = createTileBag(); // Assuming you fixed createTileBag
        const board = createEmptyBoard();

        const initialGameState = {
            gameId,
            board,
            players: [
                { playerId: player1, score: 0, rack: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], socketId: null },
                { playerId: player2, score: 0, rack: ['H', 'I', 'J', 'K', 'L', 'M', 'N'], socketId: null }
            ],
            currentPlayer: 0, // Player 1's turn
            bag: bag, // Use the tile bag created with createTileBag
            gameStarted: true,
            lastPlayedTiles: [],
            secondToLastPlayedTiles: []
        };

        activeGames[gameId] = initialGameState;

        // 2. Simulate playing a word
        const playedTiles = [
            { row: 7, col: 7, tile: 'B' },
            { row: 7, col: 8, tile: 'C' }
        ];

        // Update the board to reflect the played word
        playedTiles.forEach(p => {
            initialGameState.board[p.row][p.col] = { tile: p.tile, bonus: null, original: true };
        });

        const newTiles = ['X', 'Y']; // Mock new tiles drawn
        const wordScore = 15;

        const updatedGame = {
            ...initialGameState,
            board: initialGameState.board,
            players: [
                {
                    ...initialGameState.players[0],
                    // Simulate removing played tiles
                    rack: initialGameState.players[0].rack.filter(tile => !playedTiles.some(p => p.tile === tile)),
                    score: initialGameState.players[0].score + wordScore
                },
                initialGameState.players[1] // Player 2's rack is unchanged
            ],
            currentPlayer: 1, // Next player's turn
            lastPlayedTiles: playedTiles,
            // Simulate drawing new tiles
            bag: initialGameState.bag.filter(tile => !newTiles.includes(tile)),
        };

        // 3. Call updateGame with the simulated data
        updateGame(gameId, updatedGame);

        // 4. Assertions
        const game = getGame(gameId);

        // Check that the played tiles were removed from the player's rack
        expect(game.players[0].rack).toEqual(['A', 'D', 'E', 'F', 'G']);

        // Check that new tiles were added to the bag (Optional, you can test this separately as well)
        // expect(game.bag).toEqual(expect.not.arrayContaining(newTiles));

        // Add more assertions as needed for other aspects of the game state
    });

    // Add more tests for other scenarios, such as:
    // - Playing a word with duplicate letters
    // - Playing a word with wildcards (if applicable)
    // - Failing to play a valid word (should not remove tiles)
});