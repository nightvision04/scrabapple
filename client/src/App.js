// --- File: App.js ---
// Title: App
// Content:
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
import { createEmptyBoard, createTileBag } from './utils';
import { calculatePotentialScore, handlePlayWord, handleExchange, handlePass, handleShuffle, handleSelectBlankTile, handleNewGame } from './gameLogic';
import { onDragEnd } from './dndHandlers';
import { useAudioPlayers, playAudio } from './audioUtils';
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

    const { tapSelectAudio, tapPlaceAudio, endTurnAudio, endGameAudio } = useAudioPlayers();

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
            playAudio(endTurnAudio);
            setPlayEndTurnAudio(false);
        }
    }, [playEndTurnAudio, endTurnAudio]);

    useEffect(() => {
        if (gameStarted && bag.length === 0 && (players[0].rack.length === 0 || players[1].rack.length === 0)) {
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
        if (!isCurrentPlayerTurn) return;

        if (existingTile) {
            if (existingTile.originalTileValue && existingTile.originalTileValue === '_') {
                const newBoard = [...board];
                newBoard[row][col] = { ...newBoard[row][col], tile: null, original: false };
                setBoard(newBoard);

                const updatedPlayers = [...players];
                updatedPlayers[currentPlayer].rack.push('_');
                setPlayers(updatedPlayers);
                setSelectedTile(null);

                socket.emit('updateBoard', newBoard);
                socket.emit('updateRack', {
                    playerId: currentPlayer,
                    rack: updatedPlayers[currentPlayer].rack
                });

            } else if (!existingTile.original) {
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

    const updatePotentialScore = () => {
        const score = calculatePotentialScore(board);
        setPotentialScore(score);
    };

    const isCurrentPlayerTurn = socket && players[currentPlayer].socketId === socket.id;

    const backendOptions = {
        enableMouseEvents: true,
    };

    const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

    return (
        <div className="app m-0 bg-amber-50">
            <img src={Logo} alt="Scrabble Logo" className="logo pt-2 pb-0 w-[30vw]" />
            {gameOver && gameStarted && <EndScreen players={players} onNewGame={() => handleNewGame(setBoard, setPlayers, setCurrentPlayer, setBag, setSelectedTile, setGameStarted, setError, setPotentialScore, setShowBlankTileModal, setBlankTilePosition, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setGameOver, setSocket, SERVER_URL)} />}
            {/* {error && <div className="error">{error}</div>} */}
            {!gameStarted && <Waiting />}
            {!gameOver && gameStarted && (
                <>
                    <div className={isCurrentPlayerTurn ? "font-bold text-sm my-2" : "text-sm my-2"}>
                        {isCurrentPlayerTurn ? "Your Turn" : "Waiting for Opponent"}
                    </div>
                    <YourTurnEffect isCurrentPlayerTurn={isCurrentPlayerTurn} />

                    <StarEffects isComplete={showStarEffects} setIsComplete={setShowStarEffects}/>
                    <Scoreboard players={players} currentPlayer={currentPlayer} />

                    <div className="flex items-center justify-center text-xs gap-4">
                        <span>Score Bonus: {potentialScore !== 0 ? "+" : ''}{potentialScore !== 0 ? potentialScore : '-'}</span>
                        <span>Tiles Left: {bag.length}</span>
                    </div>
                    <DragDropContext onDragEnd={(result) => onDragEnd(result, board, players, currentPlayer, setBoard, setPlayers, setShowBlankTileModal, setBlankTilePosition, socket, updatePotentialScore)} backend={backend} options={backendOptions}>
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
                            onPlay={() => handlePlayWord(board, players, currentPlayer, bag, socket, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setCurrentPlayer, setSelectedTile, setPotentialScore, setBag, setBoard)}
                            onExchange={() => handleExchange(selectedTile, players, currentPlayer, board, setBoard, setPlayers, setSelectedTile, setPotentialScore, setCurrentPlayer, socket)}
                            onPass={() => handlePass(board, players, currentPlayer, setBoard, setPlayers, setSelectedTile, setPotentialScore, setCurrentPlayer, socket)}
                            onShuffle={() => handleShuffle(players, currentPlayer, setPlayers, socket)}
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