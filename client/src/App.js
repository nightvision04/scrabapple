import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import Board from './components/Board/Board';
import Rack from './components/Rack/Rack';
import Scoreboard from './components/Scoreboard/Scoreboard';
import GameControls from './components/GameControls/GameControls';
import Tile from './components/Tile/Tile';
import { isValidWord, calculateScore, drawTiles, createEmptyBoard, createTileBag } from './utils'; // Import createEmptyBoard and createTileBag
import './App.css';
import { LETTER_VALUES } from './constants';
import Logo from './images/logo-black.png';
import StarEffects from './components/Effects/StarEffects';
import YourTurnEffect from './components/Effects/YourTurnEffect';
import EndScreen from './components/EndScreen/EndScreen';
import Waiting from './components/Waiting/Waiting';

export const SERVER_URL = 'http://10.0.0.82:8080';

function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

function App() {
    const [socket, setSocket] = useState(null);
    const [board, setBoard] = useState([]);
    const [players, setPlayers] = useState([
        { score: 0, rack: [], socketId: null },
        { score: 0, rack: [], socketId: null }
    ]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [bag, setBag] = useState([]);
    const [selectedTile, setSelectedTile] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [error, setError] = useState('');
    const [potentialScore, setPotentialScore] = useState(0);
    const [showBlankTileModal, setShowBlankTileModal] = useState(false);
    const [blankTilePosition, setBlankTilePosition] = useState(null);
    const [turnEndScore, setTurnEndScore] = useState(0);
    const [showStarEffects, setShowStarEffects] = useState(false);
    const [playEndTurnAudio, setPlayEndTurnAudio] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    // Create audio objects once and reuse them
    const tapSelectAudio = useRef(new Audio('/tap-select.mp3')).current;
    const tapPlaceAudio = useRef(new Audio('/tap-place.mp3')).current;
    const endTurnAudio = useRef(new Audio('/stars_stereo.mp3')).current;
    const endGameAudio = useRef(new Audio('/end-game.mp3')).current;

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('joinGame');
        });

        newSocket.on('gameUpdate', (gameState) => {
            setBoard(gameState.board);
            setPlayers(gameState.players);
            setCurrentPlayer(gameState.currentPlayer);
            setBag(gameState.bag);
            setGameStarted(gameState.gameStarted);
        });

        newSocket.on('errorMessage', (message) => {
            setError(message);
        });

        newSocket.on('boardUpdate', (newBoard) => {
            setBoard(newBoard);
        });

        newSocket.on('rackUpdate', ({ playerId, rack }) => {
            setPlayers(prevPlayers => {
                const newPlayers = [...prevPlayers];
                newPlayers[playerId] = { ...newPlayers[playerId], rack };
                return newPlayers;
            });
        });

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (playEndTurnAudio) {
            endTurnAudio.currentTime = 0; // Reset sound to start
            endTurnAudio.play().catch(error => {
                console.error("Error playing audio:", error);
            });
            setPlayEndTurnAudio(false); // Reset the trigger
        }
    }, [playEndTurnAudio]);

    useEffect(() => {
        // Check for game over when the bag is empty and a player has no tiles
        if (gameStarted && bag.length === 0 && (players[0].rack.length === 0 || players[1].rack.length === 0)) {
            setGameOver(true);
        }
    }, [gameStarted, bag, players]);

    useEffect(() => {
        if (gameOver) {
          endGameAudio.currentTime = 0;
          endGameAudio.play().catch(error => {
            console.error("Error playing end game audio:", error);
          });
        }
      }, [gameOver]);

    const handleRackTileClick = (tile, index) => {
        // Play tap-select sound using the pre-created audio object
        tapSelectAudio.currentTime = 0; // Reset sound to start
        tapSelectAudio.play().catch(error => {
            console.error("Error playing audio:", error);
        });

        setSelectedTile({
            tile,
            from: {
                type: 'rack',
                index
            }
        });
    };

    const handleBoardTileClick = (row, col, existingTile) => {
        if (!isCurrentPlayerTurn) return;

        if (existingTile) {
            // Handle clicking a wildcard on the board
            if (existingTile.originalTileValue && existingTile.originalTileValue === '_') {
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: null, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer].rack.push('_'); // Return wildcard to rack
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    playerId: currentPlayer,
                    rack: updatedPlayers[currentPlayer].rack
                });

            } else if (!existingTile.original) {
                // Handle clicking a non-original (played) tile
                const newBoard = [...board];
                const newTile = existingTile.originalTileValue ? { tile: existingTile.originalTileValue, original: false } : { tile: existingTile.tile, original: false };
                newBoard[row][col] = { ...newBoard[row][col], tile: null, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer].rack.push(newTile.tile);
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    playerId: currentPlayer,
                    rack: updatedPlayers[currentPlayer].rack
                });
            }
        } else if (selectedTile) {
            // Play tap-place sound using the pre-created audio object
            tapPlaceAudio.currentTime = 0; // Reset sound to start
            tapPlaceAudio.play().catch(error => {
                console.error("Error playing audio:", error);
            });

            const newBoard = [...board];
            if (selectedTile.tile === '_') {
                setShowBlankTileModal(true);
                setBlankTilePosition({ row, col, from: 'board' });
            } else {
                newBoard[row][col] = { ...newBoard[row][col], tile: selectedTile.tile, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                const rackIndex = selectedTile.from.index;
                if (selectedTile.from.type === 'rack') {
                    updatedPlayers[currentPlayer].rack.splice(rackIndex, 1);
                    setPlayers(updatedPlayers);

                    socket.emit('updateRack', {
                        playerId: currentPlayer,
                        rack: updatedPlayers[currentPlayer].rack
                    });
                }

                setSelectedTile(null);
                socket.emit('updateBoard', newBoard);
            }
        }

        updatePotentialScore();
    };

    const onDragEnd = (result) => {
        const { destination, source } = result;

        if (!destination) return;

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        if (destination.droppableId === 'rack' && source.droppableId === 'rack') {
            const newRack = [...players[currentPlayer].rack];
            const [movedTile] = newRack.splice(source.index, 1);
            newRack.splice(destination.index, 0, movedTile);

            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
            setPlayers(updatedPlayers);
            socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
            return;
        }

        if (source.droppableId === 'rack' && destination.droppableId.startsWith('cell-')) {
            const [row, col] = destination.droppableId.split('-').slice(1).map(Number);
            const tile = players[currentPlayer].rack[source.index];

            if (tile === '_') {
                setShowBlankTileModal(true);
                setBlankTilePosition({ row, col, from: 'drag' });

                const newRack = [...players[currentPlayer].rack];
                newRack.splice(source.index, 1);
                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);

                setSelectedTile({ tile: tile, from: { type: 'rack', index: source.index } });
                return;
            }

            const newBoard = [...board];
            newBoard[row][col] = { tile, bonus: newBoard[row][col].bonus, original: false };
            setBoard(newBoard);

            const newRack = [...players[currentPlayer].rack];
            newRack.splice(source.index, 1);

            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
            setPlayers(updatedPlayers);

            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
        }

        if (source.droppableId.startsWith('cell-') && destination.droppableId === 'rack') {
            const [sourceRow, sourceCol] = source.droppableId.split('-').slice(1).map(Number);
            const tile = board[sourceRow][sourceCol].tile;
            const originalTileValue = board[sourceRow][sourceCol].originalTileValue;

            if (originalTileValue === '_') {
                const newBoard = [...board];
                newBoard[sourceRow][sourceCol] = { tile: null, bonus: newBoard[sourceRow][sourceCol].bonus, original: false };
                setBoard(newBoard);

                const newRack = [...players[currentPlayer].rack];
                newRack.splice(destination.index, 0, '_');

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
            } else {
                const newBoard = [...board];
                newBoard[sourceRow][sourceCol] = { tile: null, bonus: newBoard[sourceRow][sourceCol].bonus, original: false };
                setBoard(newBoard);

                const newRack = [...players[currentPlayer].rack];
                const newTile = originalTileValue ? originalTileValue : tile;
                newRack.splice(destination.index, 0, newTile);

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
            }
        }
        updatePotentialScore();
    };

    const calculatePotentialScore = (board) => {
        const playedTiles = [];
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (board[i][j]?.tile && !board[i][j]?.original) {
                    playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
                }
            }
        }

        if (playedTiles.length === 0) {
            return 0;
        }

        let totalScore = 0;
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
                    if (bonus === 'dl') {
                        tileScore *= 2;
                    } else if (bonus === 'tl') {
                        tileScore *= 3;
                    } else if (bonus === 'dw') {
                        wordMultiplier *= 2;
                    } else if (bonus === 'tw') {
                        wordMultiplier *= 3;
                    }
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

        // If only one tile is played, consider it horizontal by default
        const isHorizontal = playedTiles.length > 1 ? playedTiles[0].row === playedTiles[1].row : true;

        // Score the main word
        if (playedTiles.length > 0) {
            const mainWordTiles = getWordTiles(playedTiles[0].row, playedTiles[0].col, isHorizontal);
            totalScore += calculateWordScore(mainWordTiles);
        }

        // Score perpendicular words formed by the played tiles
        for (const tile of playedTiles) {
            const perpendicularWordTiles = getWordTiles(tile.row, tile.col, !isHorizontal);
            // Only score if it's a valid word (length > 1) and contains a new tile
            if (perpendicularWordTiles.length > 1 && perpendicularWordTiles.some(t => newlyPlayedTiles.has(`${t.row},${t.col}`))) {
                totalScore += calculateWordScore(perpendicularWordTiles);
            }
        }

        return totalScore;
    };

    const updatePotentialScore = () => {
        const score = calculatePotentialScore(board);
        setPotentialScore(score);
    };

    const handlePlayWord = async () => {
        const playedTiles = [];
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (board[i][j].tile && !board[i][j].original) {
                    playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
                }
            }
        }

        if (playedTiles.length === 0) {
            alert("No tiles have been played.");
            return;
        }

        const isHorizontal = playedTiles.length === 1 || playedTiles.every(tile => tile.row === playedTiles[0].row);
        const isVertical = playedTiles.length === 1 || playedTiles.every(tile => tile.col === playedTiles[0].col);

        if (!isHorizontal && !isVertical) {
            alert("Invalid word placement. Tiles must be in a straight line.");
            return;
        }

        playedTiles.sort((a, b) => isHorizontal ? a.col - b.col : a.row - b.row);

        let allWords = [];
        let totalScore = 0;

        const addWordAndScore = (newWord, tiles) => {
            if (newWord.length > 1) {
                allWords.push(newWord);
                totalScore += calculateScore(tiles, board);
            }
        };

        const processWord = (currentRow, currentCol, isMainWord = false) => {
            let tempWord = "";
            let tempTiles = [];
            let i = currentRow;
            let j = currentCol;

            if (isMainWord) {
                if (isHorizontal) {
                    while (j >= 0 && board[i][j].tile) {
                        j--;
                    }
                    j++;
                    while (j < 15 && board[i][j].tile) {
                        tempWord += board[i][j].tile;
                        tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                        j++;
                    }
                } else {
                    while (i >= 0 && board[i][j].tile) {
                        i--;
                    }
                    i++;
                    while (i < 15 && board[i][j].tile) {
                        tempWord += board[i][j].tile;
                        tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                        i++;
                    }
                }
            } else {
                if (!isHorizontal) {
                    while (j >= 0 && board[i][j].tile) {
                        j--;
                    }
                    j++;
                    while (j < 15 && board[i][j].tile) {
                        tempWord += board[i][j].tile;
                        tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                        j++;
                    }
                } else {
                    while (i >= 0 && board[i][j].tile) {
                        i--;
                    }
                    i++;
                    while (i < 15 && board[i][j].tile) {
                        tempWord += board[i][j].tile;
                        tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                        i++;
                    }
                }
            }

            if (tempWord.length > 1) {
                addWordAndScore(tempWord, tempTiles);
            }
        };

        let [startRow, startCol] = [playedTiles[0].row, playedTiles[0].col];
        processWord(startRow, startCol, true);

        for (let tile of playedTiles) {
            if (isHorizontal) {
                processWord(tile.row, tile.col, false);
            } else {
                processWord(tile.row, tile.col, false);
            }
        }

        for (let word of allWords) {
            if (!(await isValidWord(word, board))) {
                alert(`Invalid word: "${word}"`);
                return;
            }
        }

        const newBoard = board.map(row => row.map(cell => ({
            ...cell,
            original: cell.original || (cell.tile !== null)
        })));

        // Set the turn end score
        setTurnEndScore(totalScore);

        // Trigger star effects and audio
        setShowStarEffects(true);
        setPlayEndTurnAudio(true);

        // Delay for star animation and then switch to the next player
        setTimeout(() => {
            setShowStarEffects(false); // Hide star effects
            const nextPlayer = (currentPlayer + 1) % 2;
            setCurrentPlayer(nextPlayer);
            setSelectedTile(null);
            setPotentialScore(0);

            let updatedPlayers = [...players];
            const tilesToDraw = Math.max(0, 7 - updatedPlayers[currentPlayer].rack.length);
            const newTiles = drawTiles(bag, tilesToDraw);
            updatedPlayers[currentPlayer].rack = [...updatedPlayers[currentPlayer].rack, ...newTiles];

            setBag(bag.filter(tile => !newTiles.includes(tile)));
            setBoard(newBoard);

            // Update the game state on the server
            socket.emit('playWord', {
                board: newBoard,
                players: updatedPlayers.map((player, index) =>
                    index === currentPlayer
                        ? { ...player, score: player.score + totalScore }
                        : player
                ),
                currentPlayer: nextPlayer,
                bag: bag.filter(tile => !newTiles.includes(tile))
            });
        }, 1500); //increased delay slightly to allow for full star animation
    };

    const handleExchange = () => {
        if (selectedTile && selectedTile.from.type === 'rack') {
            const tileToExchange = selectedTile.tile;
            const newRack = [...players[currentPlayer].rack];
            const tileIndex = newRack.indexOf(tileToExchange);

            if (tileIndex > -1) {
                // Remove the selected tile from the rack
                newRack.splice(tileIndex, 1);

                // Clear any unplayed tiles from the board and add them back to the player's rack
                const newBoard = [...board];
                for (let i = 0; i < 15; i++) {
                    for (let j = 0; j < 15; j++) {
                        if (newBoard[i][j].tile && !newBoard[i][j].original) {
                            newRack.push(newBoard[i][j].tile);
                            newBoard[i][j] = { ...newBoard[i][j], tile: null };
                        }
                    }
                }

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };

                // Update the state for the current player
                setBoard(newBoard);
                setPlayers(updatedPlayers);
                setSelectedTile(null);
                setPotentialScore(0);

                // Switch to the next player
                const nextPlayer = (currentPlayer + 1) % 2;
                setCurrentPlayer(nextPlayer);

                // Emit the updated board, rack, and exchange to the server
                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    playerId: currentPlayer,
                    rack: newRack
                });
                socket.emit('exchangeTile', {
                    playerId: currentPlayer,
                    rack: newRack,
                    tileToExchange: tileToExchange,
                    currentPlayer: nextPlayer
                });
            }
        } else {
            alert("Please select a tile from your rack to exchange.");
        }
    };
    

    const handlePass = () => {

        // 1. Remove unplayed tiles from the board and return them to the player's rack
        const newBoard = [...board];
        const newRack = [...players[currentPlayer].rack];

        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (newBoard[i][j].tile && !newBoard[i][j].original) {
                    newRack.push(newBoard[i][j].tile);
                    newBoard[i][j] = { ...newBoard[i][j], tile: null }; // Remove tile visually
                }
            }
        }

        // 2. Update the state for the current player
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };

        setBoard(newBoard); // Update the board state to visually remove tiles
        setPlayers(updatedPlayers);
        setSelectedTile(null);
        setPotentialScore(0);

        // 3. Switch to the next player
        const nextPlayer = (currentPlayer + 1) % 2;
        setCurrentPlayer(nextPlayer);

        // 4. Emit the updated board and rack to the server AFTER the turn is switched
        socket.emit('updateBoard', newBoard);
        socket.emit('updateRack', {
            playerId: currentPlayer, // Update rack for CURRENT player
            rack: newRack
        });
        socket.emit('passTurn', {
            currentPlayer: nextPlayer
        });

    };

    const handleShuffle = () => {
        const currentRack = [...players[currentPlayer].rack];
        for (let i = currentRack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentRack[i], currentRack[j]] = [currentRack[j], currentRack[i]];
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: currentRack };
        setPlayers(updatedPlayers);

        socket.emit('shuffleRack', {
            playerId: currentPlayer,
            rack: currentRack
        });
    };

    const handleSelectBlankTile = (letter) => {
        if (blankTilePosition) {
            if (blankTilePosition.from === 'drag') {
                // Update the tile on the board
                const { row, col } = blankTilePosition;
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: letter, originalTileValue: '_', original: false };
                setBoard(newBoard);
                updatePotentialScore();

                // Emit updateBoard event to the server
                socket.emit('updateBoard', newBoard);
            } else if (blankTilePosition.from === 'board') {
                // Update the tile on the board
                const { row, col } = blankTilePosition;
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: letter, originalTileValue: '_', original: false };
                setBoard(newBoard);
                updatePotentialScore();

                // Emit updateBoard event to the server
                socket.emit('updateBoard', newBoard);
            }
            // Close the modal
            setShowBlankTileModal(false);
            setBlankTilePosition(null);
        }
    };

    const isCurrentPlayerTurn = socket && players[currentPlayer].socketId === socket.id;

    const backendOptions = {
        enableMouseEvents: true, // Enable mouse events for desktop compatibility
    };

    const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handleNewGame = () => {
        // Reset the game state
        setBoard(createEmptyBoard());
        setPlayers([
            { score: 0, rack: [], socketId: null },
            { score: 0, rack: [], socketId: null }
        ]);
        setCurrentPlayer(0);
        setBag(createTileBag());
        setSelectedTile(null);
        setGameStarted(false); // Set gameStarted to false initially
        setError('');
        setPotentialScore(0);
        setShowBlankTileModal(false);
        setBlankTilePosition(null);
        setTurnEndScore(0);
        setShowStarEffects(false);
        setPlayEndTurnAudio(false);
        setGameOver(false);
    
        // Reconnect to the server
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);
    
        newSocket.on('connect', () => {
            newSocket.emit('joinGame');
        });
    
        // Set up other event listeners as before
        newSocket.on('gameUpdate', (gameState) => {
            setBoard(gameState.board);
            setPlayers(gameState.players);
            setCurrentPlayer(gameState.currentPlayer);
            setBag(gameState.bag);
            setGameStarted(gameState.gameStarted);
        });
    
        // ... other event listeners
    
        return () => newSocket.close();
    };

    return (
        <div className="app m-0 bg-amber-50">
            <img src={Logo} alt="Scrabble Logo" className="logo pt-2 pb-0 w-[30vw]" />
            {gameOver && gameStarted && <EndScreen players={players} onNewGame={handleNewGame} />}
            {/* {error && <div className="error">{error}</div>} */}
            {!gameStarted && <Waiting />}
            {!gameOver && gameStarted && (
                <>
                    <div className={isCurrentPlayerTurn ? "font-bold text-sm my-2" : "text-sm my-2"}>
                        {isCurrentPlayerTurn ? "Your Turn" : "Waiting for Opponent"}
                    </div>
                    {/* Play "your turn" sound at the beginning of the turn */}
                    <YourTurnEffect isCurrentPlayerTurn={isCurrentPlayerTurn} />

                    {/* Show star effects at the end of the turn */}
                    <StarEffects isComplete={showStarEffects} setIsComplete={setShowStarEffects}/>
                    <Scoreboard players={players} currentPlayer={currentPlayer} />

                    <div className="flex items-center justify-center text-xs gap-4">
                        <span>Score Bonus: {potentialScore !== 0 ? "+" : ''}{potentialScore !== 0 ? potentialScore : '-'}</span>
                        <span>Tiles Left: {bag.length}</span>
                    </div>
                    <DragDropContext onDragEnd={onDragEnd} backend={backend} options={backendOptions}>
                        <Droppable droppableId="board">
                            {(provided) => (
                                <Board
                                    innerRef={provided.innerRef}
                                    {...provided.droppableProps}
                                    board={board}
                                    onTileClick={handleBoardTileClick}
                                    isCurrentPlayerTurn={isCurrentPlayerTurn}
                                    currentPlayer={currentPlayer}
                                >
                                    {provided.placeholder}
                                </Board>
                            )}
                        </Droppable>
                        <Droppable droppableId="rack" direction="horizontal">
                            {(provided) => (
                                <Rack
                                    innerRef={provided.innerRef}
                                    {...provided.droppableProps}
                                    rack={isCurrentPlayerTurn ? players[currentPlayer].rack : players[(currentPlayer + 1) % 2].rack}
                                    onTileClick={handleRackTileClick}
                                    selectedTile={selectedTile}
                                >
                                    {isCurrentPlayerTurn && players[currentPlayer].rack.map((tile, index) => (
                                        <Tile
                                            key={index}
                                            draggableId={`tile-${index}`}
                                            index={index}
                                            value={tile}
                                            isSelected={selectedTile && selectedTile.tile === tile && selectedTile.from.type === 'rack' && selectedTile.from.index === index}
                                            onTileClick={() => handleRackTileClick(tile, index)}
                                        />
                                    ))}
                                    {provided.placeholder}
                                </Rack>
                            )}
                        </Droppable>
                        <GameControls
                            onPlay={handlePlayWord}
                            onExchange={handleExchange}
                            onPass={handlePass}
                            onShuffle={handleShuffle}
                            disabled={!isCurrentPlayerTurn}
                        />
                    </DragDropContext>
                    {showBlankTileModal && (
                        <div className="modal-container fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="modal-content bg-white p-4 rounded shadow-lg">
                                <h2 className="text-lg font-bold mb-2">Select a Letter for the Blank Tile</h2>
                                <div className="alphabet-grid grid grid-cols-6 gap-2">
                                    {Array.from({ length: 26 }, (_, i) => {
                                        const letter = String.fromCharCode(65 + i);
                                        return (
                                            <button
                                                key={letter}
                                                className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                                                onClick={() => handleSelectBlankTile(letter)}
                                            >
                                                {letter}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default App;