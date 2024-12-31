import { BOARD_BONUSES, LETTER_VALUES } from './constants';

const PORT = process.env.PORT || 8080;
export const SERVER_URL = `${process.env.REACT_APP_SERVER_URL}:${PORT}`;
console.log("Loaded from env, SERVER_URL:", SERVER_URL);

export const createEmptyBoard = () => {
    const board = [];
    for (let i = 0; i < 15; i++) {
        board[i] = Array(15).fill({ tile: null, bonus: null });
    }
    for (const coord in BOARD_BONUSES) {
        const [row, col] = coord.split(',').map(Number);
        board[row][col].bonus = BOARD_BONUSES[coord];
    }
    console.log("createEmptyBoard - board (client side):", board);
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
        const response = await fetch(`${SERVER_URL}/validate-word/${word.toLowerCase()}`);
        const data = await response.json();
        return data.isValid;
    } catch (error) {
        console.error("Error validating word:", error);
        return false;
    }
};

export const calculateWordScore = (board, playedTiles, tiles) => {
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

export const getAllRelevantWords = (playedTiles, board) => {
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

export const calculateScore = (playedTiles, board) => {
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


// Function to set a cookie
export const setCookie = (name, value, days) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Function to get a cookie
export const getCookie = (name) => {
    const cookieValue = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return cookieValue ? cookieValue.pop() : '';
};