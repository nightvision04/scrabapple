// server-utils.test.js
const { calculateScore, isValidWord, createTileBag, drawTiles, createEmptyBoard } = require('./server-utils');

// Mock fetch for isValidWord
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ isValid: true }),
    })
);

beforeEach(() => {
    fetch.mockClear();
});

describe('Tile Distribution Tests', () => {
    // Helper function to count tiles in different game locations
    const countTotalTilesInGame = (bag, player1Rack, player2Rack, board) => {
        // Count tiles in bag and racks
        let totalTiles = bag.length + player1Rack.length + player2Rack.length;
    
        // Count all tiles on board, regardless of whether they're original or not
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j].tile) {
                    totalTiles++;
                }
            }
        }
    
        return totalTiles;
    };

    // Helper function to get tile distribution
    const getTileDistribution = (tiles) => {
        return tiles.reduce((acc, tile) => {
            acc[tile] = (acc[tile] || 0) + 1;
            return acc;
        }, {});
    };

    // Helper to simulate a simple word placement
    const placeWord = (board, word, startRow, startCol, isHorizontal, turnCount) => {
        // First check if the word can fit on the board
        for (let i = 0; i < word.length; i++) {
            const row = isHorizontal ? startRow : startRow + i;
            const col = isHorizontal ? startCol + i : startCol;
            
            // Check bounds
            if (row >= 15 || col >= 15) {
                return null;
            }
    
            // Check for existing tiles
            if (board[row][col].tile !== null) {
                return null;
            }
        }
    
        // If we get here, we know we can place the word
        const positions = [];
        let newBoard = board;  // Don't modify board directly
        
        for (let i = 0; i < word.length; i++) {
            const row = isHorizontal ? startRow : startRow + i;
            const col = isHorizontal ? startCol + i : startCol;
            
            newBoard[row][col] = {
                tile: word[i],
                bonus: board[row][col].bonus,
                original: turnCount === 0
            };
            
            positions.push({
                row,
                col,
                tile: word[i]
            });
        }
    
        return positions;
    };

    // Main test for tracking tile distribution through a complete game
    it('should maintain correct total tile count throughout game progression', () => {
        // Initialize game state
        const initialBag = createTileBag();
        const board = Array(15).fill(null).map(() =>
            Array(15).fill(null).map(() => ({ tile: null, bonus: null }))
        );

        // Initial draw for players
        const player1Rack = drawTiles(initialBag, 7);
        const player2Rack = drawTiles(initialBag, 7);

        // Track initial state
        const initialTotalTiles = countTotalTilesInGame(initialBag, player1Rack, player2Rack, board);
        console.log('Initial total tiles:', initialTotalTiles);
        console.log('Initial bag distribution:', getTileDistribution(initialBag));
        console.log('Player 1 rack:', player1Rack);
        console.log('Player 2 rack:', player2Rack);

        // Simulate turns until bag is empty
        let currentPlayer = 1;
        let turnCount = 0;
        let lastPlayedPositions = [];

        while (initialBag.length > 0 && turnCount < 100) {
            console.log(`\n=== Turn ${turnCount + 1} ===`);
            const currentRack = currentPlayer === 1 ? player1Rack : player2Rack;
        
            if (currentRack.length >= 2) {
                const wordToPlay = currentRack.slice(0, 2).join('');
                const startRow = 7;
                const startCol = 7 + turnCount;
        
                // Attempt to place the word
                const lastPlayedPositions = placeWord(board, wordToPlay, startRow, startCol, true, turnCount);
        
                // Only proceed with tile management if placement was successful
                if (lastPlayedPositions) {
                    const playedTiles = wordToPlay.split('');
                    playedTiles.forEach(tile => {
                        const index = currentRack.indexOf(tile);
                        if (index !== -1) {
                            currentRack.splice(index, 1);
                        }
                    });
        
                    const newTiles = drawTiles(initialBag, Math.min(2, initialBag.length));
                    currentRack.push(...newTiles);
        
                    const totalTiles = countTotalTilesInGame(initialBag, player1Rack, player2Rack, board);
                    console.log(`Total tiles after turn: ${totalTiles}`);
                    console.log(`Bag size: ${initialBag.length}`);
                    console.log(`Player 1 rack (${player1Rack.length}):`, player1Rack);
                    console.log(`Player 2 rack (${player2Rack.length}):`, player2Rack);
        
                    if (totalTiles !== initialTotalTiles) {
                        console.error(`Tile count mismatch on turn ${turnCount + 1}: Expected ${initialTotalTiles}, got ${totalTiles}`);
                        console.log('Last played positions:', lastPlayedPositions);
                        console.log('Board state:', board.map(row =>
                            row.map(cell => cell.tile || '_').join('')
                        ).join('\n'));
                    }
                }
            }
        
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            turnCount++;
        }

        // Final state verification
        const finalTotalTiles = countTotalTilesInGame(initialBag, player1Rack, player2Rack, board);
        console.log('\n=== Final Game State ===');
        console.log('Final total tiles:', finalTotalTiles);
        console.log('Final bag size:', initialBag.length);
        console.log('Final board state:', board.map(row =>
            row.map(cell => cell.tile || '_').join('')
        ).join('\n'));

        // Assertions
        expect(finalTotalTiles).toBe(initialTotalTiles);
        expect(initialBag.length).toBe(78);
    });

    it('should handle tile exchanges correctly', () => {
        const initialBag = createTileBag();
        const originalTileCount = initialBag.length;
        const player1Rack = drawTiles(initialBag, 7);

        // Simulate multiple exchanges
        for (let i = 0; i < 5; i++) {
            const tileToExchange = player1Rack[0];
            player1Rack.splice(0, 1);
            initialBag.push(tileToExchange);
            const newTile = drawTiles(initialBag, 1);
            player1Rack.push(...newTile);

            // Verify total count hasn't changed
            expect(initialBag.length + player1Rack.length).toBe(originalTileCount);
        }
    });

    // New tests for createTileBag:

    it('should create a tile bag with exactly 100 tiles', () => {
        const bag = createTileBag();
        expect(bag.length).toBe(100);
    });

    it('should create a tile bag with the correct letter distribution', () => {
        const bag = createTileBag();
        const distribution = {};
        bag.forEach(tile => {
            distribution[tile] = (distribution[tile] || 0) + 1;
        });

        const expectedDistribution = {
            'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3,
            'H': 2, 'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6,
            'O': 8, 'P': 2, 'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4,
            'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, '_': 2
        };

        expect(distribution).toEqual(expectedDistribution);
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

    it('should create a tile bag with exactly 100 tiles', () => {
        const bag = createTileBag();
        expect(bag.length).toBe(100);
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