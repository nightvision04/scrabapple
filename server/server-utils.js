const fetch = require('node-fetch');

const PORT = process.env.PORT || 8080;
const SERVER_URL = `http://localhost:${PORT}`;
console.log("Loaded from env, SERVER_URL:", SERVER_URL);

// This determines how many points eaach letter is worth
const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
    'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
    'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
    'Y': 4, 'Z': 10, '_': 0,
};

const BOARD_BONUSES = {
    '7,7': 'dw', // Center square
    '0,0': 'tw', '0,7': 'tw', '0,14': 'tw',
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


// If theres a problem client side with creating the board (like a bunch of bonnuses all on
// the same line, then use this logic instead. its working)
const createEmptyBoard = () => {
    console.log("Creating empty board (server-side)...");
    const board = [];
    for (let i = 0; i < 15; i++) {
        board[i] = [];
        for (let j = 0; j < 15; j++) {
            // Correctly initialize each cell as a new object
            board[i][j] = { tile: null, bonus: null }; 
        }
    }

    // Correctly apply bonuses using the correct BOARD_BONUSES object
    for (const coord in BOARD_BONUSES) {
        const [row, col] = coord.split(',').map(Number);
        board[row][col].bonus = BOARD_BONUSES[coord];
    }

    console.log("createEmptyBoard - board (server side):");
    return board;
};

// This counts how many of each letter exist in the bag
const createTileBag = () => {
    const distribution = {
        'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3,
        'H': 2, 'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6,
        'O': 8, 'P': 2, 'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4,
        'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, '_': 0 // wildcards disaabled for now
    };
    // To test a fast gamme, use this instead
    // const distribution = {
    //     'A': 18, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0, 'G': 0,
    //     'H': 18, 'I': 0, 'J': 0, 'K': 0, 'L': 0, 'M': 0, 'N': 0,
    //     'O': 0, 'P': 0, 'Q': 0, 'R': 0, 'S': 0, 'T': 0, 'U': 0,
    //     'V': 0, 'W': 0, 'X': 0, 'Y': 0, 'Z': 0, '_': 0
    // };
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

const isValidWord = async (word, board) => {
    if (word.length < 2) {
        return false;
    }

    try {
        const response = await fetch(`${SERVER_URL}/validate-word/${word.toLowerCase()}`);
        const data = await response.json();
        return data.isValid;
    } catch (error) {
        console.error("Error validating word:", error);
        return false;
    }
};

const calculateWordScore = (board, playedTiles, tiles) => {
    if (!tiles || !playedTiles) {
        return 0;
    }

    let wordScore = 0;
    let wordMultiplier = 1;
    const newlyPlayedTiles = new Set(playedTiles.map(tile => `${tile.row},${tile.col}`));

    if (!tiles.some(t => newlyPlayedTiles.has(`${t.row},${t.col}`))) {
        return 0;
    }

    for (const tile of tiles) {
        const { row, col, tile: letter } = tile;
        const letterValue = LETTER_VALUES[letter] || 0;
        let tileScore = letterValue;

        if (newlyPlayedTiles.has(`${row},${col}`)) {
            const bonus = board[row][col]?.bonus;
            if (bonus === 'dl') tileScore *= 2;
            else if (bonus === 'tl') tileScore *= 3;
            else if (bonus === 'dw') wordMultiplier *= 2;
            else if (bonus === 'tw') wordMultiplier *= 3;
        }

        wordScore += tileScore;
    }

    return wordScore * wordMultiplier;
};

const getWordTiles = (board, startRow, startCol, isHorizontal) => {
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

const getAllRelevantWords = (playedTiles, board) => {
    const isHorizontal = determineWordDirection(playedTiles, board);
    const words = [];
    
    const mainWordTiles = getWordTiles(board, playedTiles[0].row, playedTiles[0].col, isHorizontal);
    words.push(mainWordTiles);

    for (const tile of playedTiles) {
        const perpendicularWordTiles = getWordTiles(board, tile.row, tile.col, !isHorizontal);
        if (perpendicularWordTiles.length > 1) {
            words.push(perpendicularWordTiles);
        }
    }

    return words;
};


const determineWordDirection = (playedTiles, board) => {
    const tile = playedTiles[0];
    // Check for adjacent tiles above/below
    const hasVerticalNeighbors = (
        (tile.row > 0 && board[tile.row - 1][tile.col]?.tile) ||
        (tile.row < 14 && board[tile.row + 1][tile.col]?.tile)
    );
    // Check for adjacent tiles left/right
    const hasHorizontalNeighbors = (
        (tile.col > 0 && board[tile.row][tile.col - 1]?.tile) ||
        (tile.col < 14 && board[tile.row][tile.col + 1]?.tile)
    );
    
    if (playedTiles.length === 1) {
        // For single tile plays, check existing connections
        return hasVerticalNeighbors && !hasHorizontalNeighbors ? false : true;
    } else {
        // For multiple tiles, compare their positions
        return playedTiles[0].row === playedTiles[1].row;
    }
};

const calculateScore = (playedTiles, board) => {
    if (!playedTiles || playedTiles.length === 0) return 0;

    let totalScore = 0;
    const isHorizontal = determineWordDirection(playedTiles, board);
    
    const mainWordTiles = getWordTiles(board, playedTiles[0].row, playedTiles[0].col, isHorizontal);
    totalScore += calculateWordScore(board, playedTiles, mainWordTiles);

    for (const tile of playedTiles) {
        const perpendicularWordTiles = getWordTiles(board, tile.row, tile.col, !isHorizontal);
        if (perpendicularWordTiles.length > 1) {
            totalScore += calculateWordScore(board, playedTiles, perpendicularWordTiles);
        }
    }

    return totalScore;
};


module.exports = {
    createEmptyBoard,
    createTileBag,
    drawTiles,
    isValidWord,
    calculateScore
};