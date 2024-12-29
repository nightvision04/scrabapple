import { BOARD_BONUSES, LETTER_VALUES } from './constants';

export const createEmptyBoard = () => {
    const board = [];
    for (let i = 0; i < 15; i++) {
        board[i] = Array(15).fill({ tile: null, bonus: null });
    }
    for (const coord in BOARD_BONUSES) {
        const [row, col] = coord.split(',').map(Number);
        board[row][col].bonus = BOARD_BONUSES[coord];
    }
    return board;
};

export const createTileBag = () => {
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

export const drawTiles = (bag, num) => {
    const drawn = [];
    for (let i = 0; i < num; i++) {
        if (bag.length > 0) {
            const randomIndex = Math.floor(Math.random() * bag.length);
            drawn.push(bag.splice(randomIndex, 1)[0]);
        }
    }
    return drawn;
};

// Function to validate words using the server-side dictionary
export const isValidWord = async (word, board) => {
    if (word.length < 2) {
        return false;
    }

    try {
        const response = await fetch(`http://localhost:8080/validate-word/${word.toLowerCase()}`);
        const data = await response.json();
        return data.isValid;
    } catch (error) {
        console.error("Error validating word:", error);
        return false;
    }
};

export const calculateScore = (playedTiles, board) => {
    if (playedTiles.length === 0) return 0;
  
    const newlyPlayedTiles = new Set(playedTiles.map(tile => `${tile.row},${tile.col}`));
  
    const calculateWordScore = (tiles) => {
        let wordScore = 0;
        let wordMultiplier = 1;
        let hasNewTile = false;
  
        for (const tile of tiles) {
            const { row, col, tile: letter } = tile;
            const letterValue = LETTER_VALUES[letter] || 0;
            let tileScore = letterValue;
  
            if (newlyPlayedTiles.has(`${row},${col}`)) {
                hasNewTile = true;
                const bonus = board[row][col]?.bonus;
                if (bonus === 'dl') tileScore *= 2;
                else if (bonus === 'tl') tileScore *= 3;
                else if (bonus === 'dw') wordMultiplier *= 2;
                else if (bonus === 'tw') wordMultiplier *= 3;
            }
  
            wordScore += tileScore;
        }
  
        return hasNewTile ? wordScore * wordMultiplier : 0;
    };
  
    const getWordTiles = (startRow, startCol, isHorizontal) => {
        let tiles = [];
        let row = startRow;
        let col = startCol;
  
        // Move to the beginning of the word
        while (row >= 0 && col >= 0 && board[row][col]?.tile) {
            isHorizontal ? col-- : row--;
        }
        isHorizontal ? col++ : row++;
  
        // Collect all tiles in the word
        while (row < 15 && col < 15 && board[row][col]?.tile) {
            tiles.push({ row, col, tile: board[row][col].tile });
            isHorizontal ? col++ : row++;
        }
  
        return tiles;
    };
  
    let totalScore = 0;
  
    // 1. Find the main word direction (horizontal or vertical)
    const isHorizontal = playedTiles.length > 1 ? playedTiles[0].row === playedTiles[1].row : true;
  
    // 2. Score the main word
    const mainWordTiles = getWordTiles(playedTiles[0].row, playedTiles[0].col, isHorizontal);
    totalScore += calculateWordScore(mainWordTiles);
  
    // 3. Score perpendicular words formed by the played tiles
    for (const tile of playedTiles) {
        const perpendicularWordTiles = getWordTiles(tile.row, tile.col, !isHorizontal);
        // Only score if it's a valid word (length > 1) and contains a new tile
        if (perpendicularWordTiles.length > 1 && perpendicularWordTiles.some(t => newlyPlayedTiles.has(`${t.row},${t.col}`))) {
            totalScore += calculateWordScore(perpendicularWordTiles);
        }
    }
  
    return totalScore;
  };