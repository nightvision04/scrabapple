const { isValidWord } = require('./server-utils');

class AIOpponent {
    constructor(dictionary) {
        this.dictionary = dictionary;
        this.debugMode = true;
    }

    async findBestMove(board, rack, bag) {
        console.log('AI: Starting move calculation');
        console.log('AI: Current rack:', rack);

        // Find all possible positions where we can place tiles
        const possiblePositions = this.findPossiblePositions(board);
        console.log('AI: Found possible positions:', possiblePositions.length);

        let bestMove = {
            score: 0,
            tiles: [],
            word: ''
        };

        // Try horizontal placements first
        for (const pos of possiblePositions) {
            console.log(`AI: Evaluating position (${pos.row}, ${pos.col})`);
            const moveAttempt = await this.tryPlacementAtPosition(board, rack, pos, true);
            if (moveAttempt && moveAttempt.score > bestMove.score) {
                bestMove = moveAttempt;
                console.log('AI: Found better move:', bestMove);
            }
        }

        // If no good horizontal moves, try vertical
        if (bestMove.score === 0) {
            for (const pos of possiblePositions) {
                const moveAttempt = await this.tryPlacementAtPosition(board, rack, pos, false);
                if (moveAttempt && moveAttempt.score > bestMove.score) {
                    bestMove = moveAttempt;
                    console.log('AI: Found better vertical move:', bestMove);
                }
            }
        }

        if (bestMove.score === 0) {
            console.log('AI: No valid moves found, will need to exchange tiles');
            return null;
        }

        console.log('AI: Selected best move:', bestMove);
        return bestMove;
    }

    findPossiblePositions(board) {
        const positions = [];
        const boardIsEmpty = this.isBoardEmpty(board);

        // For empty board, only consider center position
        if (boardIsEmpty) {
            console.log('AI: Board is empty, considering center position');
            return [{ row: 7, col: 7 }];
        }

        // Find positions adjacent to existing tiles
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                if (!board[row][col].tile && this.hasAdjacentTile(board, row, col)) {
                    console.log(`AI: Found possible position at (${row}, ${col})`);
                    positions.push({ row, col });
                }
            }
        }

        return positions;
    }

    isBoardEmpty(board) {
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                if (board[row][col].tile) {
                    console.log('AI: Board is not empty');
                    return false;
                }
            }
        }
        console.log('AI: Board is empty');
        return true;
    }

    hasAdjacentTile(board, row, col) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
                if (board[newRow][newCol].tile) {
                    console.log(`AI: Found adjacent tile at (${newRow}, ${newCol})`);
                    return true;
                }
            }
        }
        console.log(`AI: No adjacent tile found for (${row}, ${col})`);
        return false;
    }

    async tryPlacementAtPosition(board, rack, pos, isHorizontal) {
        console.log(`AI: Trying placement at (${pos.row}, ${pos.col}), horizontal: ${isHorizontal}`);

        // Generate possible words that can be formed with rack letters
        let bestPlacement = null;
        const rackLetters = rack.join('');

        // Try different word lengths
        for (let len = 2; len <= Math.min(7, rack.length); len++) {
            const wordAttempts = this.generateWordAttempts(rackLetters, len);
            console.log(`AI: Generated ${wordAttempts.length} possible ${len}-letter words:`, wordAttempts);

            for (const word of wordAttempts) {
                console.log(`AI: Trying to place word: ${word}`);
                if (await this.canPlaceWord(board, word, pos, isHorizontal, rack)) {
                    const score = this.calculateWordScore(board, word, pos, isHorizontal);
                    console.log(`AI: Valid word found: ${word} with score ${score}`);

                    if (!bestPlacement || score > bestPlacement.score) {
                        bestPlacement = {
                            score,
                            word,
                            tiles: this.wordToTiles(word, pos, isHorizontal)
                        };
                    }
                } else {
                    console.log(`AI: Cannot place word ${word} at (${pos.row}, ${pos.col})`);
                }
            }
        }

        return bestPlacement;
    }

    generateWordAttempts(letters, length) {
        // Simple permutation for now - can be optimized later
        const attempts = [];
        this.permute(letters.split(''), '', length, attempts);
        return attempts;
    }

    permute(letters, prefix, length, results) {
        if (prefix.length === length) {
            results.push(prefix);
            return;
        }

        for (let i = 0; i < letters.length; i++) {
            const remaining = letters.slice(0, i).concat(letters.slice(i + 1));
            this.permute(remaining, prefix + letters[i], length, results);
        }
    }

    async canPlaceWord(board, word, pos, isHorizontal, rack) {
        console.log(`AI: Checking if word ${word} can be placed at (${pos.row}, ${pos.col})`);
        // Check if word fits on board and rack has necessary letters
        const wordLength = word.length;
        const endRow = isHorizontal ? pos.row : pos.row + wordLength - 1;
        const endCol = isHorizontal ? pos.col + wordLength - 1 : pos.col;

        if (endRow >= 15 || endCol >= 15) {
            console.log(`AI: Word ${word} does not fit on the board`);
            return false;
        }

        // Check if we have the necessary letters
        const rackLetters = [...rack];
        for (const letter of word) {
            const letterIndex = rackLetters.indexOf(letter);
            if (letterIndex === -1) {
                console.log(`AI: Rack does not have letter ${letter} for word ${word}`);
                return false;
            }
            rackLetters.splice(letterIndex, 1);
        }

        // Validate word exists in dictionary
        const isValid = this.dictionary.isValidWord(word.toUpperCase());
        console.log(`AI: Word ${word} is valid in dictionary: ${isValid}`);
        return isValid;
    }

    calculateWordScore(board, word, pos, isHorizontal) {
        let score = 0;
        let wordMultiplier = 1;

        for (let i = 0; i < word.length; i++) {
            const row = isHorizontal ? pos.row : pos.row + i;
            const col = isHorizontal ? pos.col + i : pos.col;
            const letter = word[i];
            const cell = board[row][col];

            let letterScore = this.getLetterScore(letter);

            // Apply bonuses
            if (cell.bonus) {
                switch (cell.bonus) {
                    case 'dl': letterScore *= 2; break;
                    case 'tl': letterScore *= 3; break;
                    case 'dw': wordMultiplier *= 2; break;
                    case 'tw': wordMultiplier *= 3; break;
                }
            }

            score += letterScore;
        }

        return score * wordMultiplier;
    }

    getLetterScore(letter) {
        const scores = {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10, '_': 0
        };
        return scores[letter] || 0;
    }

    wordToTiles(word, pos, isHorizontal) {
        return word.split('').map((letter, i) => ({
            row: isHorizontal ? pos.row : pos.row + i,
            col: isHorizontal ? pos.col + i : pos.col,
            tile: letter
        }));
    }
}

module.exports = AIOpponent;