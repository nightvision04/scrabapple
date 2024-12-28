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

    let totalScore = 0;
    const scoredWords = new Set();
    const newlyPlayedTiles = new Set(playedTiles.map(tile => `${tile.row},${tile.col}`));

    // Determine the primary direction of the word based on the first two tiles
    const isHorizontal = playedTiles.length > 1 ? playedTiles[0].row === playedTiles[1].row : true;

    const calculateWordScore = (tiles) => {
        let wordScore = 0;
        let wordMultiplier = 1;
        let hasNewTile = false; // Flag to check if the word has at least one new tile
    
        tiles.forEach(tile => {
            const { row, col, tile: letter } = tile;
            const letterValue = LETTER_VALUES[letter] || 0;
            let tileScore = letterValue;
            const bonus = board[row][col]?.bonus;
    
            // Apply bonuses only if the tile is newly played
            if (newlyPlayedTiles.has(`${row},${col}`)) {
                hasNewTile = true;
                if (bonus === 'dl') tileScore *= 2;
                else if (bonus === 'tl') tileScore *= 3;
                if (bonus === 'dw') wordMultiplier *= 2;
                if (bonus === 'tw') wordMultiplier *= 3;
            }
    
            wordScore += tileScore;
        });
    
        // Only return score if the word has at least one new tile
        return hasNewTile ? wordScore * wordMultiplier : 0;
    };

    const getWordTiles = (startRow, startCol, horizontal) => {
        let tiles = [];
        let row = startRow;
        let col = startCol;

        // Move to the start of the word
        while (row >= 0 && col >= 0 && board[row][col]?.tile) {
            if (horizontal) col--;
            else row--;
        }

        // Adjust to get to the first tile
        if (horizontal) col++;
        else row++;

        // Collect all tiles in the word
        while (row < 15 && col < 15 && board[row][col]?.tile) {
            tiles.push({
                row,
                col,
                tile: board[row][col].tile
            });
            if (horizontal) col++;
            else row++;
        }

        return tiles;
    };

    // Score main word
    const mainWordTiles = getWordTiles(playedTiles[0].row, playedTiles[0].col, isHorizontal);
    if (mainWordTiles.some(tile => newlyPlayedTiles.has(`${tile.row},${tile.col}`))) {
        totalScore += calculateWordScore(mainWordTiles);
        scoredWords.add(JSON.stringify(mainWordTiles));
    }

    // Score perpendicular words
    playedTiles.forEach(playedTile => {
        const { row, col } = playedTile;
        const perpendicularWord = getWordTiles(row, col, !isHorizontal);

        if (perpendicularWord.length > 1 && perpendicularWord.some(tile => newlyPlayedTiles.has(`${tile.row},${tile.col}`))) {
            const wordKey = JSON.stringify(perpendicularWord);
            if (!scoredWords.has(wordKey)) {
                totalScore += calculateWordScore(perpendicularWord);
                scoredWords.add(wordKey);
            }
        }
    });

    return totalScore;
};