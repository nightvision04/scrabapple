//App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import Board from './components/Board/Board';
import Rack from './components/Rack/Rack';
import Scoreboard from './components/Scoreboard/Scoreboard';
import GameControls from './components/GameControls/GameControls';
import Tile from './components/Tile/Tile';
import TilesLeft from './components/TilesLeft/TilesLeft';
import { createEmptyBoard, setCookie, getCookie } from './utils';
import { calculatePotentialScore, handleExchange, handleSelectBlankTile, handleNewGame } from './gameLogic';
import { onDragEnd } from './dndHandlers';
import { useAudioPlayers, playAudio } from './audioUtils';
import { calculateScore, isValidWord, drawTiles } from './utils';
import './App.css';
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
    const [board, setBoard] = useState(createEmptyBoard());
    const [players, setPlayers] = useState([]);
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
    const [playerId, setPlayerId] = useState(null);
    const [gameId, setGameId] = useState(null);

    const { tapSelectAudio, tapPlaceAudio, endTurnAudio, endGameAudio } = useAudioPlayers();

    useEffect(() => {
        const playerCookie = getCookie('player-id');
        let playerIdToUse;

        if (playerCookie) {
            setPlayerId(playerCookie);
            playerIdToUse = playerCookie;
        } else {
            const newPlayerId = Math.random().toString(36).substr(2, 9);
            setCookie('player-id', newPlayerId, 365);
            setPlayerId(newPlayerId);
            playerIdToUse = newPlayerId;
        }

        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('joinGame', playerIdToUse);
        });

        newSocket.on('gameUpdate', (gameState) => {
            console.log("Received gameUpdate:", gameState);
            console.log("Received gameUpdate board:", gameState.board);
            console.log("Received currentPlayer in gameUpdate:", gameState.currentPlayer);

            // Ensure players is always an array and has the correct structure
            const updatedPlayers = gameState.players
                ? Array.isArray(gameState.players)
                    ? gameState.players
                    : Object.values(gameState.players).map((player, index) => ({
                        playerId: Object.keys(gameState.players)[index],
                        ...player
                    }))
                : [];

            setBoard(gameState.board);
            setPlayers(updatedPlayers);
            console.log("Updated players array:", updatedPlayers)
            setCurrentPlayer(gameState.currentPlayer);
            setBag(gameState.bag);
            setGameStarted(gameState.gameStarted);
            console.log("Game started:", gameState.gameStarted);
            setGameId(gameState.gameId);

            // Check if new tiles are drawn for the current player and it's their turn
            if (gameState.newTiles && gameState.currentPlayer === updatedPlayers.findIndex(p => p.playerId === playerId)) {
                console.log("New tiles from gameUpdate:", gameState.newTiles);
                const playerIndex = updatedPlayers.findIndex(p => p.playerId === playerId);
                if (playerIndex !== -1) {
                    updatedPlayers[playerIndex].rack.push(...gameState.newTiles);
                    setPlayers(updatedPlayers);
                }
            }
        });

        newSocket.on('errorMessage', (message) => {
            setError(message);
        });

        newSocket.on('boardUpdate', (newBoard) => {
            setBoard(newBoard);
        });

        newSocket.on('rackUpdate', ({ playerId, rack }) => {
            setPlayers(prevPlayers => {
                const playerIndex = prevPlayers.findIndex(p => p.playerId === playerId);
                if (playerIndex !== -1) {
                    const updatedPlayers = [...prevPlayers];
                    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], rack };
                    return updatedPlayers;
                }
                return prevPlayers;
            });
        });

        newSocket.on('gameOver', (gameState) => {
            setGameOver(true);
            setGameId(null);
        });

        newSocket.on('gameReady', () => {
            setGameStarted(true);
            // setGameReady(true);
        });

        newSocket.on('turnUpdate', (currentPlayer) => {
            setCurrentPlayer(currentPlayer);
        });

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (playEndTurnAudio) {
            playAudio(endTurnAudio);
            setPlayEndTurnAudio(false);
        }
    }, [playEndTurnAudio, endTurnAudio]);

    useEffect(() => {
        if (gameStarted && bag.length === 0 && players.length > 0 && (players[0].rack.length === 0 || players[1].rack.length === 0)) {
            setGameOver(true);
        }
    }, [gameStarted, bag, players]);

    useEffect(() => {
        if (gameOver) {
            playAudio(endGameAudio);
        }
    }, [gameOver, endGameAudio]);

    const handleRackTileClick = (tile, index) => {
        playAudio(tapSelectAudio);
        setSelectedTile({
            tile,
            from: {
                type: 'rack',
                index
            }
        });
    };

    const handleBoardTileClick = (row, col, existingTile) => {
        if (!isCurrentPlayerTurn()) return;

        if (existingTile) {
            if (existingTile.originalTileValue && existingTile.originalTileValue === '_') {
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: null, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                updatedPlayers.find(p => p.playerId === playerId).rack.push('_');
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    gameId: gameId,
                    playerId: playerId,
                    rack: updatedPlayers.find(p => p.playerId === playerId).rack
                });

            } else if (!existingTile.original) {
                const newBoard = [...board];
                const newTile = existingTile.originalTileValue ? { tile: existingTile.originalTileValue, original: false } : { tile: existingTile.tile, original: false };
                newBoard[row][col] = { ...newBoard[row][col], tile: null, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                updatedPlayers.find(p => p.playerId === playerId).rack.push(newTile.tile);
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    gameId: gameId,
                    playerId: playerId,
                    rack: updatedPlayers.find(p => p.playerId === playerId).rack
                });
            }
        } else if (selectedTile) {
            playAudio(tapPlaceAudio);

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
                    updatedPlayers.find(p => p.playerId === playerId).rack.splice(rackIndex, 1);
                    setPlayers(updatedPlayers);

                    socket.emit('updateRack', {
                        gameId: gameId,
                        playerId: playerId,
                        rack: updatedPlayers.find(p => p.playerId === playerId).rack
                    });
                }

                setSelectedTile(null);
                socket.emit('updateBoard', newBoard);
            }
        }

        updatePotentialScore();
    };

    const updatePotentialScore = () => {
        const score = calculatePotentialScore(board);
        setPotentialScore(score);
    };

    const isCurrentPlayerTurn = () => {
        if (!gameStarted || !socket || players.length < 2) {
            return false;
        }

        // Check if the current player's ID matches the ID of the player whose turn it is
        return players[currentPlayer]?.playerId === playerId;
    };

    console.log("isCurrentPlayerTurn:", isCurrentPlayerTurn());
    console.log("gameStarted:", gameStarted);
    console.log("socket:", socket);
    console.log("players:", players);
    console.log("currentPlayer:", currentPlayer);
    console.log("playerId:", playerId);
    if (players.length > 0 && players[currentPlayer]) {
        console.log("players[currentPlayer].socketId:", players[currentPlayer].socketId);
    }
    console.log("socket.id:", socket ? socket.id : null);

    const backendOptions = {
        enableMouseEvents: true,
    };

    const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handlePlayWord = async (gameId, board, players, currentPlayer, bag, socket, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setCurrentPlayer, setSelectedTile, setPotentialScore, setBag, setBoard) => {
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
            // setCurrentPlayer(nextPlayer);
            setSelectedTile(null);
            setPotentialScore(0);

            // Update the player's rack locally before sending the update
            let updatedPlayers = [...players];
            const tilesToDraw = Math.max(0, 7 - updatedPlayers[currentPlayer].rack.length);
            const newTiles = drawTiles(bag, tilesToDraw);

            updatedPlayers[currentPlayer].rack = [...updatedPlayers[currentPlayer].rack, ...newTiles];
            updatedPlayers[currentPlayer].score += totalScore;

            setPlayers(updatedPlayers);
            setBag(bag.filter(tile => !newTiles.includes(tile)));
            setBoard(newBoard);

            // Update the game state on the server
            socket.emit('playWord', {
                gameId: gameId,
                board: newBoard,
                players: updatedPlayers,
                currentPlayer: currentPlayer, // Send the current player, not the next player
                bag: bag.filter(tile => !newTiles.includes(tile)),
                newTiles: newTiles // Send new tiles drawn for the current player
            });
        }, 1500);
    };

    const handleShuffle = () => {
        console.log("handleShuffle - Start");
        if (!socket) {
            console.error("handleShuffle - Socket is not connected");
            return;
        }
        if (!gameId) {
            console.error("handleShuffle - gameId is not defined");
            return;
        }
        if (currentPlayer === undefined || currentPlayer === null) {
            console.error("handleShuffle - currentPlayer is not defined");
            return;
        }
        if (!players[currentPlayer]) {
            console.error("handleShuffle - Could not find current player in players array");
            return;
        }

        const currentRack = [...players[currentPlayer].rack];
        console.log("handleShuffle - Current Rack Before Shuffle:", currentRack);

        // Shuffle the rack
        for (let i = currentRack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentRack[i], currentRack[j]] = [currentRack[j], currentRack[i]];
        }
        console.log("handleShuffle - Current Rack After Shuffle:", currentRack);

        // Update the local state
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: currentRack };

        setPlayers(updatedPlayers);
        console.log("handleShuffle - Updated Players:", updatedPlayers);

        // Emit the shuffleRack event to the server
        socket.emit('shuffleRack', {
            gameId: gameId,
            playerId: players[currentPlayer].playerId, // Send the playerId
            rack: currentRack
        });

        console.log("handleShuffle - Emitted shuffleRack to server");
    };

    const handlePass = (gameId, board, players, currentPlayer, setBoard, setPlayers, setSelectedTile, setPotentialScore) => {
        // Ensure socket is available
        if (!socket) {
            console.error("Socket not initialized");
            return;
        }
    
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
        updatedPlayers[currentPlayer].rack = newRack;
    
        setBoard(newBoard); // Update the board state to visually remove tiles
        setPlayers(updatedPlayers);
        setSelectedTile(null);
        setPotentialScore(0);
    
        // Emit the necessary events to the server
        socket.emit('updateBoard', newBoard);
        socket.emit('updateRack', {
            gameId: gameId,
            playerId: updatedPlayers[currentPlayer].playerId,
            rack: newRack
        });
        socket.emit('passTurn', {
            gameId: gameId,
            currentPlayer: currentPlayer // Send the current player (before the pass)
        });
    };
    
    

    return (
        <div className="app m-0 bg-amber-50">
            <img src={Logo} alt="Scrabble Logo" className="logo pt-2 pb-0 w-[30vw]" />
            {gameOver && gameStarted && <EndScreen players={players} onNewGame={() => handleNewGame(gameId, setBoard, setPlayers, setCurrentPlayer, setBag, setSelectedTile, setGameStarted, setError, setPotentialScore, setShowBlankTileModal, setBlankTilePosition, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setGameOver, socket, SERVER_URL)} />}
            {/* {error && <div className="error">{error}</div>} */}
            {!gameStarted && <Waiting />}
            {!gameOver && gameStarted && (
                <>
                    <div className={isCurrentPlayerTurn() ? "font-bold text-sm my-2" : "text-sm my-2"}>
                        {isCurrentPlayerTurn() ? "Your Turn" : "Waiting for Opponent"}
                    </div>
                    <YourTurnEffect isCurrentPlayerTurn={isCurrentPlayerTurn()} />

                    <StarEffects isComplete={showStarEffects} setIsComplete={setShowStarEffects}/>
                    <Scoreboard players={players} currentPlayer={currentPlayer} />

                    <div className="flex items-center justify-center text-xs gap-4">
                        <span>Score Bonus: {potentialScore !== 0 ? "+" : ''}{potentialScore !== 0 ? potentialScore : '-'}</span>
                        {/* Use the TilesLeft component here */}
                        <TilesLeft board={board} players={players} gameStarted={gameStarted} />
                    </div>
                    <DragDropContext onDragEnd={(result) => onDragEnd(result, board, players, currentPlayer, setBoard, setPlayers, setShowBlankTileModal, setBlankTilePosition, socket, updatePotentialScore, setSelectedTile, gameId, playerId)} backend={backend} options={backendOptions}>
                        <Droppable droppableId="board">
                            {(provided) => (
                                <Board
                                    innerRef={provided.innerRef}
                                    {...provided.droppableProps}
                                    board={board}
                                    onTileClick={handleBoardTileClick}
                                    isCurrentPlayerTurn={isCurrentPlayerTurn()}
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
                                    rack={
                                        players.length > 0
                                            ? players.find(p => p.playerId === playerId)?.rack
                                            : []
                                    }
                                    onTileClick={handleRackTileClick}
                                    selectedTile={selectedTile}
                                >
                                    {players.some(p => p.playerId === playerId) && players.find(p => p.playerId === playerId)?.rack.map((tile, index) => (
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
                            onPlay={() => handlePlayWord(gameId, board, players, currentPlayer, bag, socket, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setCurrentPlayer, setSelectedTile, setPotentialScore, setBag, setBoard)}
                            onExchange={() => handleExchange(gameId, selectedTile, players, currentPlayer, board, setBoard, setPlayers, setSelectedTile, setPotentialScore, setCurrentPlayer, socket)}
                            onPass={() => handlePass(gameId, board, players, currentPlayer, setBoard, setPlayers, setSelectedTile, setPotentialScore, socket)}
                            onShuffle={() => handleShuffle()}
                            disabled={!isCurrentPlayerTurn()}
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
                                                onClick={() => handleSelectBlankTile(letter, blankTilePosition, board, setBoard, updatePotentialScore, socket, setShowBlankTileModal, setBlankTilePosition)}
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