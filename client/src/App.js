import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import Board from './components/Board/Board';
import Rack from './components/Rack/Rack';
import Scoreboard from './components/Scoreboard/Scoreboard';
import GameControls from './components/GameControls/GameControls';
import Tile from './components/Tile/Tile';
import { isValidWord, calculateScore } from './utils';
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
        // Check if it's the current player's turn
        if (!isCurrentPlayerTurn) {
            return; // Do nothing if it's not the current player's turn
        }
    
        if (existingTile) {
            // Remove tile from board and return to rack
            const newBoard = [...board];
            newBoard[row][col] = { ...newBoard[row][col], tile: null };
            setBoard(newBoard);
    
            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer].rack.push(existingTile);
            setPlayers(updatedPlayers);
            setSelectedTile(null);
    
            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', {
                playerId: currentPlayer,
                rack: updatedPlayers[currentPlayer].rack
            });
        } else if (selectedTile) {
            // Place tile on board and remove from rack
            const newBoard = [...board];
            newBoard[row][col] = { ...newBoard[row][col], tile: selectedTile.tile };
            setBoard(newBoard);
    
            // Remove the tile from the rack
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
    };
    

    const onDragEnd = (result) => {
        const { destination, source } = result;

        if (!destination) return;

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return; // Tile dropped in the same place
        }

        if (destination.droppableId === 'rack' && source.droppableId === 'rack') {
            // Reorder tile within the rack
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
            // Move tile from rack to board
            const [row, col] = destination.droppableId.split('-').slice(1).map(Number);
            const tile = players[currentPlayer].rack[source.index];

            // Update board
            const newBoard = [...board];
            newBoard[row][col] = { tile, bonus: newBoard[row][col].bonus };
            setBoard(newBoard);

            // Update rack
            const newRack = [...players[currentPlayer].rack];
            newRack.splice(source.index, 1);

            // Update players
            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
            setPlayers(updatedPlayers);

            // Send updates to server
            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
            return;
        }

        if (source.droppableId.startsWith('cell-') && destination.droppableId === 'rack') {
            // Move tile from board back to rack
            const [sourceRow, sourceCol] = source.droppableId.split('-').slice(1).map(Number);
            const tile = board[sourceRow][sourceCol].tile;

            // Update board
            const newBoard = [...board];
            newBoard[sourceRow][sourceCol] = { tile: null, bonus: newBoard[sourceRow][sourceCol].bonus };
            setBoard(newBoard);

            // Update rack
            const newRack = [...players[currentPlayer].rack];
            newRack.splice(destination.index, 0, tile);

            // Update players
            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
            setPlayers(updatedPlayers);

            // Send updates to server
            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', { playerId: currentPlayer, rack: newRack });
            return;
        }
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
    
        let word = "";
        let [startRow, startCol] = [playedTiles[0].row, playedTiles[0].col];
    
        if (isHorizontal) {
            let i = startCol;
            while (i >= 0 && board[startRow][i].tile) {
                startCol = i;
                i--;
            }
            i = startCol;
            while (i < 15 && board[startRow][i].tile) {
                word += board[startRow][i].tile;
                i++;
            }
        } else {
            let i = startRow;
            while (i >= 0 && board[i][startCol].tile) {
                startRow = i;
                i--;
            }
            i = startRow;
            while (i < 15 && board[i][startCol].tile) {
                word += board[i][startCol].tile;
                i++;
            }
        }
    
        if (!(await isValidWord(word, board))) {
            alert(`Invalid word: "${word}"`);
            return;
        }
    
        const score = calculateScore(playedTiles, board);
    
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer].score += score;
    
        const newBoard = board.map(row => row.map(cell => ({ ...cell, original: cell.tile ? true : false })));
        setBoard(newBoard);
    
        const nextPlayer = (currentPlayer + 1) % 2;
        setCurrentPlayer(nextPlayer);
        setSelectedTile(null);
    
        socket.emit('playWord', {
            board: newBoard,
            players: updatedPlayers,
            currentPlayer: nextPlayer
        });
    };
    

    const handleExchange = () => {
        if (selectedTile && selectedTile.from.type === 'rack') {
            const tileToExchange = selectedTile.tile;
            const newRack = [...players[currentPlayer].rack];
            const tileIndex = newRack.indexOf(tileToExchange);

            if (tileIndex > -1) {
                newRack.splice(tileIndex, 1); // Remove tile from rack

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: newRack };
                setPlayers(updatedPlayers);
                setSelectedTile(null); // Clear selected tile

                // Switch to the next player
                const nextPlayer = (currentPlayer + 1) % 2;
                setCurrentPlayer(nextPlayer);

                // Send updated game state to server, including the tile to exchange
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
        // Switch to the next player
        const nextPlayer = (currentPlayer + 1) % 2
        setCurrentPlayer(nextPlayer);
        setSelectedTile(null);

        // Send updated game state to server
        socket.emit('passTurn', {
            currentPlayer: nextPlayer
        });
    };

    const handleShuffle = () => {
        const currentRack = [...players[currentPlayer].rack];
        for (let i = currentRack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentRack[i], currentRack[j]] = [currentRack[j], currentRack[i]]; // Swap
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players[currentPlayer], rack: currentRack };
        setPlayers(updatedPlayers);

        // Send updated game state to server
        socket.emit('shuffleRack', {
            playerId: currentPlayer,
            rack: currentRack
        });
    };

    // Determine if it's the current player's turn based on currentPlayer from server
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
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Scoreboard players={players} currentPlayer={currentPlayer} />
                        <Droppable droppableId="board">
                            {(provided) => (
                                <Board
                                    innerRef={provided.innerRef}
                                    {...provided.droppableProps}
                                    board={board}
                                    onTileClick={handleBoardTileClick}
                                    isCurrentPlayerTurn={isCurrentPlayerTurn} // Pass isCurrentPlayerTurn to Board
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
                                    rack={players[currentPlayer].rack}
                                    onTileClick={handleRackTileClick}
                                    selectedTile={selectedTile}
                                >
                                    {players[currentPlayer].rack.map((tile, index) => (
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
                </>
            )}
        </div>
    );
}

export default App;