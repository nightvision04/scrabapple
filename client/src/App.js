// --- File: App.js ---
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import Board from "./components/Board/Board";
import Rack from "./components/Rack/Rack";
import Scoreboard from "./components/Scoreboard/Scoreboard";
import GameControls from "./components/GameControls/GameControls";
import Tile from "./components/Tile/Tile";
import TilesLeft from "./components/TilesLeft/TilesLeft";
import { createEmptyBoard, setCookie, getCookie } from "./utils";
import {
  calculatePotentialScore,
  handleExchange,
  handleSelectBlankTile,
  handleNewGame,
  handlePlayWord,
  handleShuffle,
  handlePass,
} from "./gameLogic";
import { onDragEnd } from "./dndHandlers";
import { useAudioPlayers, playAudio } from "./audioUtils";
import { calculateScore, isValidWord, getAllRelevantWords, SERVER_URL } from "./utils";
import "./App.css";
import Logo from "./images/logo-black.png";
import StarEffects from "./components/Effects/StarEffects";
import YourTurnEffect from "./components/Effects/YourTurnEffect";
import EndScreen from "./components/EndScreen/EndScreen";
import Waiting from "./components/Waiting/Waiting";

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const [board, setBoard] = useState(createEmptyBoard());
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [bag, setBag] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState("");
  const [potentialScore, setPotentialScore] = useState(0);
  const [showBlankTileModal, setShowBlankTileModal] = useState(false);
  const [blankTilePosition, setBlankTilePosition] = useState(null);
  const [turnEndScore, setTurnEndScore] = useState(0);
  const [showStarEffects, setShowStarEffects] = useState(false);
  const [playEndTurnAudio, setPlayEndTurnAudio] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [lastPlayedTiles, setLastPlayedTiles] = useState([]);
  const [secondToLastPlayedTiles, setSecondToLastPlayedTiles] = useState([]);

  const { tapSelectAudio, tapPlaceAudio, endTurnAudio, endGameAudio } =
    useAudioPlayers();

    useEffect(() => {
        const playerCookie = getCookie("player-id");
        let playerIdToUse;

        if (playerCookie) {
          setPlayerId(playerCookie);
          playerIdToUse = playerCookie;
        } else {
          const newPlayerId = Math.random().toString(36).substr(2, 9);
          setCookie("player-id", newPlayerId, 365);
          setPlayerId(newPlayerId);
          playerIdToUse = newPlayerId;
        }

        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on("connect", () => {
          newSocket.emit("joinGame", playerIdToUse);
        });

        newSocket.on("gameUpdate", (gameState) => {
          console.log("Received gameUpdate:", gameState);
          console.log("Received gameUpdate board:", gameState.board);
          console.log("Received currentPlayer in gameUpdate:", gameState.currentPlayer);

          // Ensure players is always an array and has the correct structure
          const updatedPlayers = gameState.players
            ? Array.isArray(gameState.players)
              ? gameState.players
              : Object.values(gameState.players).map((player, index) => ({
                  playerId: Object.keys(gameState.players)[index],
                  ...player,
                }))
            : [];

          setBoard(gameState.board);
          setPlayers(updatedPlayers);
          console.log("Updated players array:", updatedPlayers);
          setCurrentPlayer(gameState.currentPlayer);
          setBag(gameState.bag);
          setGameStarted(gameState.gameStarted);
          console.log("Game started:", gameState.gameStarted);
          setGameId(gameState.gameId);
          setSecondToLastPlayedTiles(gameState.secondToLastPlayedTiles || []);
          setLastPlayedTiles(gameState.lastPlayedTiles || []);

          // Check if new tiles are drawn for the current player and it's their turn
          if (
            gameState.newTiles &&
            gameState.currentPlayer ===
              updatedPlayers.findIndex((p) => p.playerId === playerIdToUse)
          ) {
            console.log("New tiles from gameUpdate:", gameState.newTiles);
            const playerIndex = updatedPlayers.findIndex(
              (p) => p.playerId === playerIdToUse
            );
            if (playerIndex !== -1) {
              updatedPlayers[playerIndex].rack.push(...gameState.newTiles);
              setPlayers(updatedPlayers);
            }
          }
        });

        newSocket.on("errorMessage", (message) => {
          setError(message);
        });

        newSocket.on("boardUpdate", (newBoard) => {
          setBoard(newBoard);
        });

        newSocket.on("rackUpdate", ({ playerId, rack }) => {
          setPlayers((prevPlayers) => {
            const playerIndex = prevPlayers.findIndex(
              (p) => p.playerId === playerId
            );
            if (playerIndex !== -1) {
              const updatedPlayers = [...prevPlayers];
              updatedPlayers[playerIndex] = {
                ...updatedPlayers[playerIndex],
                rack,
              };
              return updatedPlayers;
            }
            return prevPlayers;
          });
        });

        newSocket.on("gameOver", (gameState) => {
          setGameOver(true);
          setGameId(null);
        });

        newSocket.on("gameReady", () => {
          setGameStarted(true);
        });

        newSocket.on("turnUpdate", (currentPlayer) => {
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
    if (
      gameStarted &&
      bag.length === 0 &&
      players.length > 0 &&
      (players[0].rack.length === 0 || players[1].rack.length === 0)
    ) {
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
        type: "rack",
        index,
      },
    });
  };

  const handleBoardTileClick = (row, col, existingTile) => {
    if (!isCurrentPlayerTurn()) return;

    if (existingTile) {
      const newBoard = [...board];
      const updatedPlayers = [...players];
      const player = updatedPlayers.find((p) => p.playerId === playerId);

      // Return tile to rack with its ORIGINAL value
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: null,
        original: false,
        originalTileValue: null,
      };
      player.rack.push(existingTile.originalTileValue);
      setSelectedTile({
        tile: existingTile.originalTileValue,
        from: { type: "rack", index: player.rack.length - 1 },
      });

      setBoard(newBoard);
      setPlayers(updatedPlayers);

      socket.emit("updateBoard", newBoard);
      socket.emit("updateRack", {
        gameId: gameId,
        playerId: playerId,
        rack: player.rack,
      });
    } else if (selectedTile) {
      playAudio(tapPlaceAudio);

      const newBoard = [...board];
      if (selectedTile.tile === "_") {
        setShowBlankTileModal(true);
        // Include gameId here:
        setBlankTilePosition({ row, col, from: "board", gameId: gameId });

        // Remove the wildcard from the rack
        const updatedPlayers = [...players];
        const rackIndex = selectedTile.from.index;
        if (selectedTile.from.type === "rack") {
          updatedPlayers
            .find((p) => p.playerId === playerId)
            .rack.splice(rackIndex, 1);
          setPlayers(updatedPlayers);

          socket.emit("updateRack", {
            gameId: gameId,
            playerId: playerId,
            rack: updatedPlayers.find((p) => p.playerId === playerId).rack,
          });
        }
      } else {
        // Place the tile with its original value
        newBoard[row][col] = {
          ...newBoard[row][col],
          tile: selectedTile.tile,
          original: false,
          originalTileValue: selectedTile.tile, // Store original tile value for later
        };
        setBoard(newBoard);

        const updatedPlayers = [...players];
        const rackIndex = selectedTile.from.index;
        if (selectedTile.from.type === "rack") {
          updatedPlayers
            .find((p) => p.playerId === playerId)
            .rack.splice(rackIndex, 1);
          setPlayers(updatedPlayers);

          socket.emit("updateRack", {
            gameId: gameId,
            playerId: playerId,
            rack: updatedPlayers.find((p) => p.playerId === playerId).rack,
          });
        }

        setSelectedTile(null);
        socket.emit("updateBoard", newBoard);
      }
    }

    updatePotentialScore();
  };

// In App.js

const updatePotentialScore = async () => {
  const playedTiles = [];
  for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
          if (board[i][j]?.tile && !board[i][j]?.original) {
              playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
          }
      }
  }

  if (playedTiles.length === 0) {
      setPotentialScore(0);
      return;
  }

  const words = getAllRelevantWords(playedTiles, board);
  
  for (const wordTiles of words) {
      const word = wordTiles.map(tile => tile.tile).join("").toLowerCase();
      if (word.length === 1) {
          if (!isConnectedToExistingTile(wordTiles[0].row, wordTiles[0].col, board)) {
              setPotentialScore(0);
              return;
          }
      } else if (!(await isValidWord(word, board))) {
          setPotentialScore(0);
          return;
      }
  }

  const score = calculateScore(playedTiles, board);
  setPotentialScore(score);
};

// Helper function to check for connection to existing tiles, especially the first tile
const isConnectedToExistingTile = (row, col, board) => {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Up, Down, Left, Right
  for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol]?.tile) {
          return true;
      }
  }
  return false;
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
    console.log(
      "players[currentPlayer].socketId:",
      players[currentPlayer].socketId
    );
  }
  console.log("socket.id:", socket ? socket.id : null);

  const backendOptions = {
    enableMouseEvents: true,
  };

  const backend = isTouchDevice() ? TouchBackend : TouchBackend;

  return (
    <div className="app m-0 bg-[#F5E6EB]">
      <img
        src={Logo}
        alt="Scrabble Logo"
        className="logo pt-2 pb-0 w-[30vw]"
      />
      {gameOver && gameStarted && (
        <EndScreen
          players={players}
          onNewGame={() =>
            handleNewGame(
              gameId,
              setBoard,
              setPlayers,
              setCurrentPlayer,
              setBag,
              setSelectedTile,
              setGameStarted,
              setError,
              setPotentialScore,
              setShowBlankTileModal,
              setBlankTilePosition,
              setTurnEndScore,
              setShowStarEffects,
              setPlayEndTurnAudio,
              setGameOver,
              setSocket,
              SERVER_URL,
              setLastPlayedTiles,
              setSecondToLastPlayedTiles
            )
          }
        />
      )}
      {/* {error && <div className="error">{error}</div>} */}
      {!gameStarted && <Waiting />}
      {!gameOver && gameStarted && (
        <>
          <div
            className={
              isCurrentPlayerTurn()
                ? "font-bold text-sm my-2"
                : "text-sm my-2"
            }
          >
            {isCurrentPlayerTurn()
              ? "Your Turn"
              : "Waiting for Opponent"}
          </div>
          <YourTurnEffect isCurrentPlayerTurn={isCurrentPlayerTurn()} />

          <StarEffects
            isComplete={showStarEffects}
            setIsComplete={setShowStarEffects}
          />
          <Scoreboard players={players} currentPlayer={currentPlayer} />

          <div className="flex items-center justify-center text-xs gap-4">
            <span>
              Points:{" "}
              {potentialScore === 0 &&
              (getWordTiles().length > 0 ||
                calculatePotentialScore(board) === 0)
                ? "-"
                : `+${potentialScore}`}
            </span>
            {/* Use the TilesLeft component here */}
            <TilesLeft
              board={board}
              players={players}
              gameStarted={gameStarted}
            />
          </div>
          <DragDropContext
            onDragEnd={(result) =>
              onDragEnd(
                result,
                board,
                players,
                currentPlayer,
                setBoard,
                setPlayers,
                setShowBlankTileModal,
                setBlankTilePosition,
                socket,
                updatePotentialScore,
                setSelectedTile,
                gameId,
                playerId
              )
            }
            backend={backend}
            options={backendOptions}
          >
            <Droppable droppableId="board">
              {(provided) => (
                <Board
                  innerRef={provided.innerRef}
                  {...provided.droppableProps}
                  board={board}
                  onTileClick={handleBoardTileClick}
                  isCurrentPlayerTurn={isCurrentPlayerTurn()}
                  currentPlayer={currentPlayer}
                  lastPlayedTiles={lastPlayedTiles}
                  secondToLastPlayedTiles={secondToLastPlayedTiles}
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
                      ? players.find((p) => p.playerId === playerId)?.rack
                      : []
                  }
                  onTileClick={handleRackTileClick}
                  selectedTile={selectedTile}
                  isCurrentPlayerTurn={isCurrentPlayerTurn}
                >
                  {players.some((p) => p.playerId === playerId) &&
                    players
                      .find((p) => p.playerId === playerId)
                      ?.rack.map((tile, index) => (
                        <Tile
                          key={index}
                          draggableId={`tile-${index}`}
                          index={index}
                          value={tile}
                          isSelected={
                            selectedTile &&
                            selectedTile.tile === tile &&
                            selectedTile.from.type === "rack" &&
                            selectedTile.from.index === index
                          }
                          onTileClick={() =>
                            handleRackTileClick(tile, index)
                          }
                        />
                      ))}
                  {provided.placeholder}
                </Rack>
              )}
            </Droppable>
            <GameControls
              onPlay={() =>
                handlePlayWord(
                  gameId,
                  board,
                  players,
                  currentPlayer,
                  bag,
                  socket,
                  setTurnEndScore,
                  setShowStarEffects,
                  setPlayEndTurnAudio,
                  setCurrentPlayer,
                  setSelectedTile,
                  setPotentialScore,
                  setBag,
                  setBoard,
                  setPlayers,
                  setLastPlayedTiles,
                  setSecondToLastPlayedTiles
                )
              }
              onExchange={() =>
                handleExchange(
                  gameId,
                  selectedTile,
                  players,
                  currentPlayer,
                  board,
                  setBoard,
                  setPlayers,
                  setSelectedTile,
                  setPotentialScore,
                  setCurrentPlayer,
                  socket
                )
              }
              onPass={() =>
                handlePass(
                  gameId,
                  board,
                  players,
                  currentPlayer,
                  setBoard,
                  setPlayers,
                  setSelectedTile,
                  setPotentialScore,
                  socket
                )
              }
              onShuffle={() => handleShuffle(players, playerId, socket, gameId, setPlayers)}
              disablePlay={!isCurrentPlayerTurn()}
              disableExchangePass={!isCurrentPlayerTurn()}
            />
          </DragDropContext>
          {showBlankTileModal && (
            <div className="modal-container fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="modal-content bg-white p-4 rounded shadow-lg">
                <h2 className="text-lg font-bold mb-2">
                  Select a Letter for the Blank Tile
                </h2>
                <div className="alphabet-grid grid grid-cols-6 gap-2">
                  {Array.from({ length: 26 }, (_, i) => {
                    const letter = String.fromCharCode(65 + i);
                    return (
                      <button
                        key={letter}
                        className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                        onClick={() =>
                          handleSelectBlankTile(
                            letter,
                            blankTilePosition,
                            board,
                            setBoard,
                            updatePotentialScore,
                            socket,
                            setShowBlankTileModal,
                            setBlankTilePosition,
                            players,
                            playerId
                          )
                        }
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