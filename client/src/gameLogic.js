// --- File: gameLogic.js ---
// Title: gameLogic
// Content:
import { isValidWord, calculateScore, drawTiles, createEmptyBoard, createTileBag } from './utils';
import { LETTER_VALUES } from './constants';
import io from 'socket.io-client';

export const calculatePotentialScore = (board) => {
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

export const handlePlayWord = async (board, players, currentPlayer, bag, socket, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setCurrentPlayer, setSelectedTile, setPotentialScore, setBag, setBoard) => {
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
  }, 1500);
};

export const handleExchange = (selectedTile, players, currentPlayer, board, setBoard, setPlayers, setSelectedTile, setPotentialScore, setCurrentPlayer, socket) => {
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

export const handlePass = (board, players, currentPlayer, setBoard, setPlayers, setSelectedTile, setPotentialScore, setCurrentPlayer, socket) => {
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

export const handleShuffle = (players, currentPlayer, setPlayers, socket) => {
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

export const handleSelectBlankTile = (letter, blankTilePosition, board, setBoard, updatePotentialScore, socket, setShowBlankTileModal, setBlankTilePosition) => {
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

export const handleNewGame = (setBoard, setPlayers, setCurrentPlayer, setBag, setSelectedTile, setGameStarted, setError, setPotentialScore, setShowBlankTileModal, setBlankTilePosition, setTurnEndScore, setShowStarEffects, setPlayEndTurnAudio, setGameOver, setSocket, SERVER_URL) => {
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
};