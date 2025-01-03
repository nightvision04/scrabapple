import { calculateScore, isValidWord, createTileBag, drawTiles } from './utils';

// Mock fetch for isValidWord
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ isValid: true }),
    })
);

beforeEach(() => {
    fetch.mockClear();
});

describe('calculateScore', () => {
    const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));

        // Basic scoring tests
        it('should calculate score correctly for player 2 playing FAR after player 1 played AT', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
    
            // Setup the board with Player 1's word "AT"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'A', bonus: 'dw', original: true }; // A on double word
            board[7][8] = { tile: 'T', bonus: null, original: true };
    
            // Player 2 plays "FAR" connecting to "A"
            const playedTiles = [
                { row: 6, col: 7, tile: 'F' }, // F above A
                { row: 8, col: 7, tile: 'R' }  // R below A
            ];
            board[6][7] = { tile: 'F', bonus: null };
            board[8][7] = { tile: 'R', bonus: null };
    
            // Calculate the score
            const score = calculateScore(playedTiles, board);
    
            // Expected score: F(4) + A(1) + R(1) = 6, no double word score applied
            expect(score).toBe(6);
        });

        it('should calculate score correctly for player 2 playing PAY after player 1 played DAD', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "DAD"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'D', bonus: null, original: true };
            board[7][8] = { tile: 'A', bonus: null, original: true };
            board[7][9] = { tile: 'D', bonus: null, original: true };
        
            // Player 2 plays "PAY" connecting to "A"
            const playedTiles = [
                { row: 6, col: 8, tile: 'P' }, // P above A
                { row: 8, col: 8, tile: 'Y' }  // Y below A
            ];
            board[6][8] = { tile: 'P', bonus: 'dl' }; // P on a double letter
            board[8][8] = { tile: 'Y', bonus: 'dl' }; // Y on a double letter
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: (P=3 * 2) + A=1 + (Y=4 * 2) = 6 + 1 + 8 = 15
            expect(score).toBe(15);
        });

        it('should calculate score correctly for player 1 adding MENT to PAY after player 2 played PAY', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "DAD" and Player 2's word "PAY"
            const board = [...emptyBoard];
            board[7][6] = { tile: 'D', bonus: null, original: true };
            board[7][7] = { tile: 'A', bonus: null, original: true };
            board[7][8] = { tile: 'D', bonus: null, original: true };
            board[6][7] = { tile: 'P', bonus: 'dl', original: true };
            board[8][7] = { tile: 'Y', bonus: 'dl', original: true };
        
            // Player 1 adds "MENT" to "PAY"
            const playedTiles = [
                { row: 9, col: 7, tile: 'M' },
                { row: 10, col: 7, tile: 'E' },
                { row: 11, col: 7, tile: 'N' },
                { row: 12, col: 7, tile: 'T' }
            ];
            board[9][7] = { tile: 'M', bonus: null };
            board[10][7] = { tile: 'E', bonus: null };
            board[11][7] = { tile: 'N', bonus: null };
            board[12][7] = { tile: 'T', bonus: 'tl' }; // T on a triple letter
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: M(3) + E(1) + N(1) + (T(1) * 3) = 3 + 1 + 1 + 3 = 8
            expect(score).toBe(16);
        });

        it('should calculate score correctly for player 1 playing WADE', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board for Player 1's word "WADE"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'W', bonus: 'dw' }; // W on a double word bonus
            board[7][8] = { tile: 'A', bonus: null };
            board[7][9] = { tile: 'D', bonus: null };
            board[7][10] = { tile: 'E', bonus: null };
        
            // Player 1 plays "WADE"
            const playedTiles = [
                { row: 7, col: 7, tile: 'W' },
                { row: 7, col: 8, tile: 'A' },
                { row: 7, col: 9, tile: 'D' },
                { row: 7, col: 10, tile: 'E' }
            ];
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: (W(4)  + A(1) + D(2) + E(1)) *DW = (4 + 1 + 2 + 1)*2 = 16
            expect(score).toBe(16);
        });

        it('should calculate score correctly for player 2 adding COP to WADE', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "WADE"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'W', bonus: 'dw', original: true };
            board[7][8] = { tile: 'A', bonus: null, original: true };
            board[7][9] = { tile: 'D', bonus: null, original: true };
            board[7][10] = { tile: 'E', bonus: null, original: true };
        
            // Player 2 adds "COP" (connecting to the 'E' in "WADE")
            const playedTiles = [
                { row: 8, col: 10, tile: 'C' },
                { row: 9, col: 10, tile: 'O' },
                { row: 10, col: 10, tile: 'P' }
            ];
            board[8][10] = { tile: 'C', bonus: 'dw' }; // C on a double word bonus
            board[9][10] = { tile: 'O', bonus: null };
            board[10][10] = { tile: 'P', bonus: null };
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: (C(3) + O(1) + P(3) + E(1)) * 2 = (3 + 1 + 3 + 1) * 2 = 8 * 2 = 16
            expect(score).toBe(16);
        });

        it('should calculate score correctly for player 2 playing IN after player 1 played PEN', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "PEN"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'P', bonus: null, original: true };
            board[7][8] = { tile: 'E', bonus: null, original: true };
            board[7][9] = { tile: 'N', bonus: null, original: true };
        
            // Player 2 adds "IN" (connecting to the 'P' in "PEN")
            const playedTiles = [
                { row: 8, col: 7, tile: 'I' },
                { row: 9, col: 7, tile: 'N' }
            ];
            board[8][7] = { tile: 'I', bonus: null };
            board[9][7] = { tile: 'N', bonus: null };
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: P(3) + I(1) + N(1) = 5
            expect(score).toBe(5);
        });

        it('should calculate score correctly for player 1 playing TI after player 2 played IN', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "PEN" and Player 2's word "IN"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'P', bonus: null, original: true };
            board[7][8] = { tile: 'E', bonus: null, original: true };
            board[7][9] = { tile: 'N', bonus: null, original: true };
            board[8][7] = { tile: 'I', bonus: null, original: true };
            board[9][7] = { tile: 'N', bonus: null, original: true };
        
            // Player 1 adds "TI" (connecting to the 'N' in "IN")
            const playedTiles = [
                { row: 9, col: 6, tile: 'T' },
                { row: 9, col: 8, tile: 'I' }
            ];
            board[9][6] = { tile: 'T', bonus: 'dl' }; // T on a double letter bonus
            board[9][8] = { tile: 'I', bonus: null };
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: (T(1) * 2) + I(1) + N(1) = 2 + 1 + 1 = 4
            expect(score).toBe(4);
        });

        it('should calculate score correctly for player 1 playing RI after adding TI', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's words "PEN", "TI", and Player 2's word "IN"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'P', bonus: null, original: true };
            board[7][8] = { tile: 'E', bonus: null, original: true };
            board[7][9] = { tile: 'N', bonus: null, original: true };
            board[8][7] = { tile: 'I', bonus: null, original: true };
            board[9][7] = { tile: 'N', bonus: null, original: true };
            board[9][6] = { tile: 'T', bonus: 'dl', original: true };
            board[9][8] = { tile: 'I', bonus: null, original: true };
        
            // Player 1 adds "RI" (connecting to the 'P' in "PEN")
            const playedTiles = [
                { row: 7, col: 5, tile: 'R' },
                { row: 7, col: 6, tile: 'I' }
            ];
            board[7][5] = { tile: 'R', bonus: null };
            board[7][6] = { tile: 'I', bonus: null };
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: R(1) + I(1) + P(3) + E(1) + N(1) = 7
            expect(score).toBe(7);
        });

        it('should calculate score correctly for player 2 playing H to connect with A after player 1 played AHA', () => {
            // Initialize an empty board
            const emptyBoard = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
        
            // Setup the board with Player 1's word "AHA"
            const board = [...emptyBoard];
            board[7][7] = { tile: 'A', bonus: null, original: true };
            board[7][8] = { tile: 'H', bonus: null, original: true };
            board[7][9] = { tile: 'A', bonus: null, original: true };
        
            // Player 2 plays "H" (connecting to create "HA" vertically)
            const playedTiles = [
                { row: 6, col: 7, tile: 'H' }  // H above the A in AHA, on triple letter
            ];
            board[6][7] = { tile: 'H', bonus: 'tl' }; // H on a triple letter bonus
        
            // Calculate the score
            const score = calculateScore(playedTiles, board);
        
            // Expected score: (H=4 * 3 for triple letter) + A=1 = 13
            expect(score).toBe(13);

            // Add another A to the board
            board[6][8] = { tile: 'A', bonus: null };
            const playedTilesAgain = [
                { row: 6, col: 8, tile: 'A' } // A to the right of the H, forming HA (horiz) annd AH (vert)
            ];
            const scoreAgain = calculateScore(playedTilesAgain, board);

            //Expected score: H4 + A1 (word HA) + A1 + H4(word AH) = 4 + 1 + 1 + 4 = 10
            expect(scoreAgain).toBe(10);

        });

        it('should add 50-point bonus when playing all 7 tiles', () => {
            const board = Array(15).fill(null).map(() => Array(15).fill({ tile: null, bonus: null }));
            
            // Playing "RAINBOW" horizontally from center
            const playedTiles = [
                { row: 7, col: 7, tile: 'R' },
                { row: 7, col: 8, tile: 'A' },
                { row: 7, col: 9, tile: 'I' },
                { row: 7, col: 10, tile: 'N' },
                { row: 7, col: 11, tile: 'B' },
                { row: 7, col: 12, tile: 'O' },
                { row: 7, col: 13, tile: 'W' }
            ];

            // Place tiles on board
            playedTiles.forEach(({row, col, tile}) => {
                board[row][col] = { tile, bonus: null };
            });

            const score = calculateScore(playedTiles, board);
            // R(1) + A(1) + I(1) + N(1) + B(3) + O(1) + W(4) = 12 base points + 50 bonus = 62
            expect(score).toBe(62);
        });

    });

describe('isValidWord', () => {
    it('returns true for a valid word', async () => {
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve({ isValid: true }),
            })
        );

        const valid = await isValidWord('HELLO');
        expect(valid).toBe(true);
    });

    it('returns false for an invalid word', async () => {
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve({ isValid: false }),
            })
        );

        const valid = await isValidWord('XYZ');
        expect(valid).toBe(false);
    });

    it('returns false for a word less than 2 letters', async () => {
        const valid = await isValidWord('A');
        expect(valid).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('handles fetch error', async () => {
        const originalConsoleError = console.error;
        console.error = jest.fn();

        fetch.mockImplementationOnce(() => Promise.reject('Error'));

        const valid = await isValidWord('TEST');
        expect(valid).toBe(false);

        console.error = originalConsoleError;
    });
});

describe('createTileBag', () => {
    it('creates a tile bag with the correct distribution', () => {
        const bag = createTileBag();
        const expectedDistribution = {
            'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3,
            'H': 2, 'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6,
            'O': 8, 'P': 2, 'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4,
            'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, '_': 2
        };
        const counts = {};
        bag.forEach(tile => {
            counts[tile] = (counts[tile] || 0) + 1;
        });
        expect(counts).toEqual(expectedDistribution);
    });
});

describe('drawTiles', () => {
    it('draws the correct number of tiles', () => {
        const bag = ['A', 'B', 'C', 'D', 'E'];
        const drawn = drawTiles(bag, 3);
        expect(drawn.length).toBe(3);
        expect(bag.length).toBe(2);
    });

    it('returns empty array if bag is empty', () => {
        const bag = [];
        const drawn = drawTiles(bag, 5);
        expect(drawn.length).toBe(0);
    });

    it('does not draw more tiles than are in the bag', () => {
        const bag = ['A', 'B', 'C'];
        const drawn = drawTiles(bag, 5);
        expect(drawn.length).toBe(3);
        expect(bag.length).toBe(0);
    });
});