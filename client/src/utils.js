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
        const response = await fetch(`http://localhost:8080/validate-word/${word}`);
        const data = await response.json();
        return data.isValid;
    } catch (error) {
        console.error("Error validating word:", error);
        return false;
    }
};

export const calculateScore = (playedTiles, board) => {
    let score = 0;
    let wordMultiplier = 1;

    playedTiles.forEach(tile => {
        const { row, col, tile: letter } = tile;
        const letterValue = LETTER_VALUES[letter];
        const bonus = board[row][col].bonus;

        let tileScore = letterValue;

        if (bonus === 'dl') {
            tileScore *= 2;
        } else if (bonus === 'tl') {
            tileScore *= 3;
        } else if (bonus === 'dw') {
            wordMultiplier *= 2;
        } else if (bonus === 'tw') {
            wordMultiplier *= 3;
        }

        score += tileScore;
    });

    return score * wordMultiplier;
};