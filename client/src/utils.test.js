import { calculateScore, isValidWord, createTileBag, drawTiles } from './utils';
import { BOARD_BONUSES, LETTER_VALUES } from './constants';

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
    it('should score a single letter with no bonuses correctly', () => {
        const board = [...emptyBoard];
        // Using 'K' which is worth 5 points in Scrabble
        board[7][7] = { tile: 'K', bonus: null };
        const score = calculateScore([{ row: 7, col: 7, tile: 'K' }], board);
        expect(score).toBe(5);
    });

    it('should score a simple horizontal word with no bonuses correctly', () => {
        const board = [...emptyBoard];
        // "DOG" = 2 + 1 + 2 = 5 points
        board[7][7] = { tile: 'D', bonus: null };
        board[7][8] = { tile: 'O', bonus: null };
        board[7][9] = { tile: 'G', bonus: null };
        const score = calculateScore([
            { row: 7, col: 7, tile: 'D' },
            { row: 7, col: 8, tile: 'O' },
            { row: 7, col: 9, tile: 'G' }
        ], board);
        expect(score).toBe(5);
    });

    // Bonus tile tests
    it('should apply double letter score correctly', () => {
        const board = [...emptyBoard];
        // "DOG" with double letter on 'O' = 2 + (1*2) + 2 = 6 points
        board[7][7] = { tile: 'D', bonus: null };
        board[7][8] = { tile: 'O', bonus: 'dl' };
        board[7][9] = { tile: 'G', bonus: null };
        const score = calculateScore([
            { row: 7, col: 7, tile: 'D' },
            { row: 7, col: 8, tile: 'O' },
            { row: 7, col: 9, tile: 'G' }
        ], board);
        expect(score).toBe(6);
    });

    it('should apply triple word score correctly', () => {
        const board = [...emptyBoard];
        // "DOG" with triple word = (2 + 1 + 2) * 3 = 15 points
        board[7][7] = { tile: 'D', bonus: 'tw' };
        board[7][8] = { tile: 'O', bonus: null };
        board[7][9] = { tile: 'G', bonus: null };
        const score = calculateScore([
            { row: 7, col: 7, tile: 'D' },
            { row: 7, col: 8, tile: 'O' },
            { row: 7, col: 9, tile: 'G' }
        ], board);
        expect(score).toBe(15);
    });

    // Blank tile tests
    it('should handle blank tiles correctly', () => {
        const board = [...emptyBoard];
        // "D_G" with blank tile for 'O' = 2 + 0 + 2 = 4 points
        board[7][7] = { tile: 'D', bonus: null };
        board[7][8] = { tile: '_', bonus: null, originalTileValue: '_' };
        board[7][9] = { tile: 'G', bonus: null };
        const score = calculateScore([
            { row: 7, col: 7, tile: 'D' },
            { row: 7, col: 8, tile: '_' },
            { row: 7, col: 9, tile: 'G' }
        ], board);
        expect(score).toBe(4);
    });

    // Multiple word formation tests
    it('should score perpendicular word formations correctly', () => {
        const board = [...emptyBoard];
        // Existing "CAT" horizontally
        board[7][7] = { tile: 'C', bonus: null }; // 3 points
        board[7][8] = { tile: 'A', bonus: null }; // 1 point
        board[7][9] = { tile: 'T', bonus: null }; // 1 point

        // Playing 'R' to form "RAT" vertically
        board[6][7] = { tile: 'R', bonus: null } // R = 1 point, played now
        const score = calculateScore([{ row: 6, col: 7, tile: 'R' }], board);
        // Should score the new word "RAT" = 1 + 1 + 1 = 3 points
        expect(score).toBe(3);
    });

    it('should score multiple perpendicular words correctly', () => {
        const board = [...emptyBoard];
        // Existing horizontal "HEAT"
        board[7][7] = { tile: 'H', bonus: null };
        board[7][8] = { tile: 'E', bonus: null };
        board[7][9] = { tile: 'A', bonus: null };
        board[7][10] = { tile: 'T', bonus: null };

        // Playing 'ATS' vertically to form "AT" and "HEATS"
        board[8][9] = { tile: 'T', bonus: null }
        board[9][9] = { tile: 'S', bonus: null }
        const score = calculateScore([
            { row: 8, col: 9, tile: 'T' },
            { row: 9, col: 9, tile: 'S' }
        ], board);
        // Should score "ATS" = 1 + 1 + 1 = 3 points + "HEATS" = 4 + 1 + 1 + 1 + 1 = 8
        // Total = 3 + 8 = 11
        expect(score).toBe(11);
    });

    it('should handle complex bonus combinations correctly', () => {
        const board = [...emptyBoard];
        // Playing "QUIZ" with:
        // - Q on triple word
        // - U on double letter
        // - Z on triple letter
        board[7][7] = { tile: 'Q', bonus: 'tw' }; // 10 points
        board[7][8] = { tile: 'U', bonus: 'dl' }; // 1 point * 2
        board[7][9] = { tile: 'I', bonus: null };  // 1 point
        board[7][10] = { tile: 'Z', bonus: 'tl' }; // 10 points * 3

        const score = calculateScore([
            { row: 7, col: 7, tile: 'Q' },
            { row: 7, col: 8, tile: 'U' },
            { row: 7, col: 9, tile: 'I' },
            { row: 7, col: 10, tile: 'Z' }
        ], board);
        // Base: 10 + (1*2) + 1 + (10*3) = 43
        // Then triple word: 43 * 3 = 129
        expect(score).toBe(129);
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
        expect(fetch).toHaveBeenCalledWith('http://localhost:8080/validate-word/hello');
    });

    it('returns false for an invalid word', async () => {
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve({ isValid: false }),
            })
        );

        const valid = await isValidWord('XYZ');
        expect(valid).toBe(false);
        expect(fetch).toHaveBeenCalledWith('http://localhost:8080/validate-word/xyz');
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
        expect(fetch).toHaveBeenCalledWith('http://localhost:8080/validate-word/test');

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