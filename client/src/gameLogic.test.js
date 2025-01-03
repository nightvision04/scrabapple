import { handlePlayWord } from './gameLogic';
import { createEmptyBoard } from './utils';

describe('handlePlayWord', () => {
    let mockSetters;
    let mockSocket;
    let testBoard;
    let testPlayers;
    let testGameId;
    let testBag;

    const setup = () => {
        // Set up environment variables
        process.env.REACT_APP_SERVER_URL = 'http://test-server';

        // Mock fetch for word validation - return valid for AM and invalid for A
        global.fetch = jest.fn((url) => {
            const word = url.split('/').pop().toLowerCase();
            return Promise.resolve({
                json: () => Promise.resolve({
                    isValid: word.length > 1 // Only validate words longer than 1 letter
                })
            });
        });

        mockSetters = {
            setTurnEndScore: jest.fn(),
            setShowStarEffects: jest.fn(),
            setPlayEndTurnAudio: jest.fn(),
            setCurrentPlayer: jest.fn(),
            setSelectedTile: jest.fn(),
            setPotentialScore: jest.fn(),
            setBag: jest.fn(),
            setBoard: jest.fn(),
            setPlayers: jest.fn(),
            setLastPlayedTiles: jest.fn(),
            setSecondToLastPlayedTiles: jest.fn(),
            setTurnTimerKey: jest.fn(),
            setGameOver: jest.fn()
        };

        mockSocket = {
            emit: jest.fn()
        };

        testBoard = createEmptyBoard();
        testPlayers = [
            { playerId: 'player1', rack: ['A','M','T','A','L','I','P'], score: 0 },
            { playerId: 'player2', rack: [], score: 0 }
        ];
        testGameId = 'test-game';
        testBag = [];

        global.alert = jest.fn();
        jest.useFakeTimers();
    };

    beforeEach(setup);

    afterEach(() => {
        jest.clearAllMocks();
    });

    const executePlayWord = async () => {
        await handlePlayWord(
            testGameId,
            testBoard,
            testPlayers,
            0,
            testBag,
            mockSocket,
            mockSetters.setTurnEndScore,
            mockSetters.setShowStarEffects,
            mockSetters.setPlayEndTurnAudio,
            mockSetters.setCurrentPlayer,
            mockSetters.setSelectedTile,
            mockSetters.setPotentialScore,
            mockSetters.setBag,
            mockSetters.setBoard,
            mockSetters.setPlayers,
            mockSetters.setLastPlayedTiles,
            mockSetters.setSecondToLastPlayedTiles,
            [],
            mockSetters.setTurnTimerKey,
            mockSetters.setGameOver
        );
    };

    it('rejects single letters that are surrounded by blank spaces', async () => {
        testBoard[7][7] = { tile: 'A', bonus: null, original: false };
        await executePlayWord();
        expect(global.alert).toHaveBeenCalledWith('Invalid word placement - must create at least one scoring word');
    });

    it('accepts a two-letter word AM horizontally, running through the center of the board', async () => {
        testBoard[7][7] = { tile: 'A', bonus: null, original: false };
        testBoard[7][8] = { tile: 'M', bonus: null, original: false };
        await executePlayWord();
        expect(global.alert).toHaveBeenCalledTimes(0);
    });

    it('rejects a two-letter word AM horizontally, not running through the center of the board', async () => {
        testBoard[5][7] = { tile: 'A', bonus: null, original: false };
        testBoard[5][8] = { tile: 'M', bonus: null, original: false };
        await executePlayWord();
        expect(global.alert).toHaveBeenCalledWith('Invalid word placement - First word needs to connect to the center of the board');
    });

    it('rejects a two-letter word (TA) that is not connected to any other word', async () => {
        // New word TA is not connected to any existing word
        testBoard[4][6] = { tile: 'T', bonus: null, original: false };
        testBoard[4][7] = { tile: 'A', bonus: null, original: false };

        // Existing word AM from first turn
        testBoard[7][7] = { tile: 'L', bonus: null, original: true };
        testBoard[7][8] = { tile: 'I', bonus: null, original: true };
        testBoard[7][8] = { tile: 'P', bonus: null, original: true };
        await executePlayWord();
        expect(global.alert).toHaveBeenCalledWith('Invalid word placement - must connect to existing words');
    });

    it('correctly calculates final scores when game ends including rack deductions', async () => {
        // Set up a game-ending scenario
        testBoard[7][7] = { tile: 'W', bonus: 'dw', original: false };
        testBoard[7][8] = { tile: 'I', bonus: null, original: false };
        testBoard[7][9] = { tile: 'N', bonus: null, original: false };
        
        testPlayers = [
            { playerId: 'player1', rack: ['Q', 'Z', 'X'], score: 100 }, // High-value tiles remaining
            { playerId: 'player2', rack: [], score: 90 } // Empty rack triggers game end
        ];
        testBag = []; // Empty bag for game end condition

        await executePlayWord();
        jest.advanceTimersByTime(1500);

        // Find the playWord emit call
        const emitCall = mockSocket.emit.mock.calls.find(call => call[0] === 'playWord');
        const updatedPlayers = emitCall[1].players;

        // Check final scores:
        // Player 1: 100 (initial) + 12 (WIN) - 28 (Q=10 + Z=10 + X=8) = 84
        // Player 2: 90 (initial) - 0 (empty rack) = 90
        expect(updatedPlayers[0].score).toBe(84);
        expect(updatedPlayers[1].score).toBe(90);
        expect(mockSetters.setGameOver).toHaveBeenCalledWith(true);
    });
});