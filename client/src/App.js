import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import Board from './components/Board/Board';
import Rack from './components/Rack/Rack';
import Scoreboard from './components/Scoreboard/Scoreboard';
import GameControls from './components/GameControls/GameControls';
import Tile from './components/Tile/Tile';
import { isValidWord, calculateScore, drawTiles } from './utils';
import './App.css';

const SERVER_URL = 'http://localhost:8080';

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

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server');
            newSocket.emit('joinGame');
        });

        newSocket.on('gameUpdate', (gameState) => {
            console.log("gameUpdate received:", gameState);
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

    const handleRackTileClick = (tile, index) => {
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
            const newBoard = [...board];
            const newTile = existingTile.originalTileValue ? { tile: existingTile.originalTileValue, original: false } : { tile: '_', original: false };
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
        } else if (selectedTile) {
            const newBoard = [...board];
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
                setBlankTilePosition({ row, col });
    
                const newRack = [...players[currentPlayer].rack];
                const [movedTile] = newRack.splice(source.index, 1);
    
                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);
                setSelectedTile({ tile: movedTile, from: { type: 'rack', index: source.index } });
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
        updatePotentialScore();
    };

    const calculatePotentialScore = () => {
        const playedTiles = [];
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (board[i][j].tile && !board[i][j].original) {
                    playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
                }
            }
        }
    
        if (playedTiles.length === 0) {
            return 0;
        }
    
        let totalScore = 0;
        let allWords = [];
    
        const isHorizontal = playedTiles.length === 1 || playedTiles.every(tile => tile.row === playedTiles[0].row);
        const isVertical = playedTiles.length === 1 || playedTiles.every(tile => tile.col === playedTiles[0].col);
    
        playedTiles.sort((a, b) => isHorizontal ? a.col - b.col : a.row - b.row);
    
        const addWordAndScore = (newWord, tiles) => {
            if (newWord.length > 1) {
                allWords.push(newWord);
                totalScore += calculateScore(tiles, board);
            }
        };
    
        let [startRow, startCol] = [playedTiles[0].row, playedTiles[0].col];
        let word = "";
        let wordTiles = [];
    
        const processWord = (currentRow, currentCol) => {
            let tempWord = "";
            let tempTiles = [];
            let i = currentRow;
            let j = currentCol;
    
            // Extend word in the negative direction
            if (isHorizontal) {
                while (j >= 0 && board[i][j].tile) {
                    tempWord = board[i][j].tile + tempWord;
                    tempTiles.unshift({ row: i, col: j, tile: board[i][j].tile });
                    j--;
                }
            } else {
                while (i >= 0 && board[i][j].tile) {
                    tempWord = board[i][j].tile + tempWord;
                    tempTiles.unshift({ row: i, col: j, tile: board[i][j].tile });
                    i--;
                }
            }
    
            // Extend word in the positive direction, skipping the starting tile for words longer than 1 tile
            if (isHorizontal) {
                j = currentCol + 1;
                while (j < 15 && board[i][j].tile) {
                    tempWord += board[i][j].tile;
                    tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                    j++;
                }
            } else {
                i = currentRow + 1;
                while (i < 15 && board[i][j].tile) {
                    tempWord += board[i][j].tile;
                    tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                    i++;
                }
            }
    
            // Add word and score if word length is greater than 1
            if (tempWord.length > 1) {
                addWordAndScore(tempWord, tempTiles);
            }
        };
    
        // Process the main word
        if (isHorizontal) {
            processWord(startRow, startCol);
        } else {
            processWord(startRow, startCol);
        }
    
        // Process perpendicular words
        for (let tile of playedTiles) {
            if (isHorizontal) {
                processWord(tile.row, tile.col, false);
            } else {
                processWord(tile.row, tile.col, true);
            }
        }
    
        return totalScore;
    };

    const updatePotentialScore = () => {
        const score = calculatePotentialScore();
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
        setBoard(newBoard);
    
        const nextPlayer = (currentPlayer + 1) % 2;
        setCurrentPlayer(nextPlayer);
        setSelectedTile(null);
        setPotentialScore(0);
    
        let updatedPlayers = [...players];
        const tilesToDraw = Math.max(0, 7 - updatedPlayers[currentPlayer].rack.length);
        const newTiles = drawTiles(bag, tilesToDraw);
        updatedPlayers[currentPlayer].rack = [...updatedPlayers[currentPlayer].rack, ...newTiles];
    
        setBag(bag.filter(tile => !newTiles.includes(tile)));
    
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
    };

    const handleExchange = () => {
        if (selectedTile && selectedTile.from.type === 'rack') {
            const tileToExchange = selectedTile.tile;
            const newRack = [...players[currentPlayer].rack];
            const tileIndex = newRack.indexOf(tileToExchange);

            if (tileIndex > -1) {
                newRack.splice(tileIndex, 1);

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                const nextPlayer = (currentPlayer + 1) % 2;
                setCurrentPlayer(nextPlayer);

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
        const nextPlayer = (currentPlayer + 1) % 2
        setCurrentPlayer(nextPlayer);
        setSelectedTile(null);

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
            if (blankTilePosition.from === 'rack') {
                // Update the tile in the rack
                const updatedPlayers = [...players];
                const rackIndex = selectedTile.from.index;
                updatedPlayers[currentPlayer].rack[rackIndex] = letter;
                setPlayers(updatedPlayers);
                setSelectedTile({ tile: letter, from: { type: 'rack', index: rackIndex } });
            } else {
                // Update the tile on the board
                const { row, col } = blankTilePosition;
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: letter, original: false };
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

    return (
        <div className="app">
            <h1>Scrabble Game</h1>
            {error && <div className="error">{error}</div>}
            {!gameStarted && <div>Waiting for another player...</div>}
            {gameStarted && (
                <>
                    <div className="turn-indicator">
                        {isCurrentPlayerTurn ? "Your Turn" : "Waiting for Opponent"}
                    </div>
                    <Scoreboard players={players} currentPlayer={currentPlayer} />
                    <div className="potential-score">
                        Potential Score: {potentialScore}
                    </div>
                    <DragDropContext onDragEnd={onDragEnd}>
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
                        <div className="modal-container">
                            <div className="modal-content">
                                <h2>Select a Letter for the Blank Tile</h2>
                                <div className="alphabet-grid">
                                    {Array.from({ length: 26 }, (_, i) => {
                                        const letter = String.fromCharCode(65 + i);
                                        return (
                                            <button
                                                key={letter}
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